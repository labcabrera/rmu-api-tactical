import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { Game } from '../../../../games/domain/aggregates/game.js';
import type { ActorRound, EffectApplication } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { rollProfileOf } from '../../../../actor-rounds/domain/value-objects/actor-roll-profile.vo.js';
import { checkOpenEndedDice } from '../../../../shared/domain/rolls/open-ended.js';
import { applyNaturalRoll } from '../../../domain/services/roll-talents.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { isShieldManeuverPending } from '../../../domain/value-objects/shield-maneuver.vo.js';
import { Action } from '../../../domain/aggregates/action.js';
import { ActionUpdatedEvent } from '../../../domain/events/action.events.js';
import { opportunisticStrikeTrigger } from '../../../domain/services/reaction-rules.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { CombatAttackRollResolverService } from '../../services/combat/index.js';
import { UpdateAttackRollCommand } from '../commands/update-attack-roll.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(UpdateAttackRollCommand)
export class UpdateAttackRollHandler implements ICommandHandler<UpdateAttackRollCommand, Action> {
  private readonly logger = new Logger(UpdateAttackRollHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    private readonly combatAttackRollResolver: CombatAttackRollResolverService,
  ) {}

  async execute(command: UpdateAttackRollCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);

    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);

    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);
    game.checkNotFinished();

    this.validateCommand(command, action);

    const attack = action.attacks!.find(a => a.attackName === command.attackName)!;
    const targetActor = await this.actorRoundRepository.findByActorIdAndRound(action.gameId, attack.modifiers.targetId!, action.round);
    if (!targetActor) throw new NotFoundError('ActorRound', attack.modifiers.targetId!);

    const sourceActor = await this.actorRoundRepository.findByActorIdAndRound(action.gameId, action.actorId, action.round);
    if (!sourceActor) throw new NotFoundError('ActorRound', action.actorId);

    // Workspace spec 076, §2.8: the dice sent are a high open-ended chain of the attacker's roll profile.
    checkOpenEndedDice(command.rolls, 'high', rollProfileOf(sourceActor.traits), { total: command.roll, unmodified: command.unmodified });

    const previousBreakage = !!attack.calculated?.breakageRoll;
    const previousFumble = !!attack.results?.fumble;
    await this.combatAttackRollResolver.resolve({
      action,
      attack,
      sourceActor,
      targetActor,
      roll: command.roll,
      unmodified: command.unmodified,
      dice: command.rolls,
      criticalRoll: command.criticalRoll,
    });

    // Raised when the roll is resolved; a repeated roll does not raise it again.
    let sourceChanged = false;
    if (attack.calculated?.breakageRoll && !previousBreakage) {
      sourceActor.addAttackBreakageAlert(attack.attackName);
      sourceChanged = true;
    }
    // Workspace spec 068, decision 5: a fumble is a failed roll, and it reopens the stitches of the attacker
    if (attack.results?.fumble && !previousFumble && sourceActor.reopenWounds('failed-roll').length > 0) {
      sourceChanged = true;
    }
    // Workspace spec 076, decision B10 (P5): Terrible Luck and Spasm on the natural roll of the attack.
    const natural = applyNaturalRoll(
      sourceActor,
      command.unmodified ?? command.rolls?.[0],
      { kind: 'attack', actionId: action.id, attackName: attack.attackName },
      { spasmRounds: command.spasmRounds, application: () => UpdateAttackRollHandler.applicationOf(game, sourceActor) },
    );
    if (natural.terribleLuck || natural.spasm) {
      sourceChanged = true;
    }
    if (sourceChanged) {
      await this.actorRoundRepository.update(sourceActor);
    }
    // Workspace spec 076, decision B3: a new fumble of a melee attack lets a target with Opportunistic Strike attack.
    const opportunistic = attack.results?.fumble && !previousFumble ? opportunisticStrikeTrigger(action, attack, targetActor) : undefined;
    if (opportunistic && targetActor.addReactionAlert({ ...opportunistic, round: action.round, phase: game.phase })) {
      await this.actorRoundRepository.update(targetActor);
    }

    action.updatedAt = new Date();

    const updated = await this.actionRepository.update(action);
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    return updated;
  }

  /** When an effect of the roll lands: the current action phase and the AP the actor spent before it. */
  static applicationOf(game: Game, actor: ActorRound): EffectApplication | undefined {
    const phase = Game.toActionPhase(game.phase);
    return phase === undefined ? undefined : { phase, spentAp: actor.getSpentAp(phase) };
  }

  private validateCommand(command: UpdateAttackRollCommand, action: Action): void {
    if (!action.attacks || action.attacks.length === 0) {
      throw new ValidationError(`Action ${action.id} has no attacks`);
    }
    const attack = action.attacks.find(a => a.attackName === command.attackName);
    if (!attack) {
      throw new ValidationError(`Attack ${command.attackName} not found in action ${action.id}`);
    }
    if (!attack.calculated) {
      throw new ValidationError(`Attack ${command.attackName} has no calculated data`);
    }
    // Workspace spec 082, decision 8: a parry left it without OB, so the action has to be prepared again.
    if (action.spendsRoundBo() && attack.modifiers.bo === 0) {
      throw new ValidationError(`The attack ${command.attackName} has no OB`, 'err-attack-no-ob', { attackName: command.attackName });
    }
    // Workspace spec 077, decision A1.7: the Shield maneuver comes before the attack roll.
    if (isShieldManeuverPending(attack.shieldManeuver)) {
      throw new ValidationError(`The Shield maneuver against ${command.attackName} is pending`, 'err-shield-maneuver-required', {
        attackName: command.attackName,
      });
    }
    action.checkValidRollDeclaration();
  }
}
