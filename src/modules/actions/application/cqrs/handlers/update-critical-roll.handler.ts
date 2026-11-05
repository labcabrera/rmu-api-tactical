import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Action } from '../../../domain/aggregates/action.js';
import { applyStyleCriticalOption, checkStyleCriticalOption } from '../../../domain/services/style-critical-option.js';
import { type CriticalRerollGrant, findCriticalReroll } from '../../../domain/services/critical-reroll.js';
import type { ActionAttack } from '../../../domain/value-objects/action-attack.vo.js';
import { ActionUpdatedEvent } from '../../../domain/events/action.events.js';
import type { AttackLocation } from '../../../domain/value-objects/attack-location.vo.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { type CriticalTablePort, CRITICAL_TABLE_PORT } from '../../ports/critical-table.port.js';
import { CombatProcessor } from '../../services/combat/index.js';
import { UpdateCriticalRollCommand } from '../commands/update-critical-roll.command.js';
import { checkOpenEndedDice, DEFAULT_OPEN_ENDED } from '../../../../shared/domain/rolls/open-ended.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

const MIN_CRITICAL_ROLL = 1;
const MAX_CRITICAL_ROLL = 100;

/** Location of a critical table result (limbs in singular) as an attack location, so the next criticals hit it too. */
const ATTACK_LOCATIONS: AttackLocation[] = ['head', 'chest', 'abdomen', 'arms', 'legs'];

const toAttackLocation = (location: string | undefined): AttackLocation | undefined => {
  const value = location === 'arm' ? 'arms' : location === 'leg' ? 'legs' : location;
  return ATTACK_LOCATIONS.find(candidate => candidate === value);
};

@CommandHandler(UpdateCriticalRollCommand)
export class UpdateCriticalRollHandler implements ICommandHandler<UpdateCriticalRollCommand, Action> {
  private readonly logger = new Logger(UpdateCriticalRollHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(CRITICAL_TABLE_PORT) private readonly criticalTablePort: CriticalTablePort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    private readonly combatProcessor: CombatProcessor,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
  ) {}

  async execute(command: UpdateCriticalRollCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    checkOpenEndedDice(command.dice, 'none', DEFAULT_OPEN_ENDED, { total: command.roll });

    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);

    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);
    game.checkNotFinished();

    action.checkValidCriticalRollDeclaration(command.attackName, command.criticalKey, command.roll);
    const attack = action.getAttackByName(command.attackName);
    if (!attack.results?.criticals?.some(c => c.key === command.criticalKey)) {
      throw new ValidationError(`Critical ${command.criticalKey} not found in attack ${command.attackName}`);
    }

    // Nothing is applied until the attack is: until then the roll can change, as the attack and fumble rolls.
    if (action.status === 'completed' || attack.status === 'completed') {
      throw new ValidationError(`Attack ${command.attackName} has already been applied`, 'err-attack-completed');
    }

    const criticalRolls = attack.roll!.criticalRolls;
    attack.roll!.criticalRolls = criticalRolls instanceof Map ? criticalRolls : new Map(Object.entries(criticalRolls || {}));
    // §9.8: every critical of the attack uses the same roll and the same location. Each roll, the first or a new one,
    // resolves all of them again from the location of the attack.
    let location = attack.calculated?.location;
    const { sourceActor, targetActor } = await this.readActors(action, attack.modifiers.targetId);
    const reroll = command.reroll
      ? UpdateCriticalRollHandler.checkReroll(attack, command.criticalKey, sourceActor, targetActor)
      : undefined;
    const previousRolls = new Map(attack.roll!.criticalRolls);
    this.applyStyleOption(command, attack, sourceActor);
    for (const each of attack.results.criticals) {
      const ctx = await this.combatProcessor.runPhase('criticalRoll', {
        action,
        attack,
        sourceActor,
        targetActor,
        sourceTraits: sourceActor?.traits || [],
        targetTraits: targetActor?.traits || [],
        criticalKey: each.key,
        criticalRoll: command.roll,
        location,
        trace: [],
      });
      // The raw roll is stored; the adjusted one goes in the critical.
      attack.roll!.criticalRolls.set(each.key, command.roll);
      each.adjustedRoll = Math.min(Math.max(ctx.criticalRoll ?? command.roll, MIN_CRITICAL_ROLL), MAX_CRITICAL_ROLL);
      each.result = await this.criticalTablePort.lookup({
        criticalType: each.criticalType,
        criticalSeverity: each.criticalSeverity,
        roll: each.adjustedRoll,
        location: ctx.location ?? location,
      });
      each.status = 'completed';
      if (reroll) {
        each.originalRoll = previousRolls.get(each.key) ?? null;
        each.rerolledBy = reroll.kind;
      }
      location = location ?? toAttackLocation(each.result.location);
    }
    action.refreshAttackStatuses();
    // The effect is used up with the new roll.
    if (reroll) {
      reroll.holder.consumeEffects([reroll.effect.id]);
      await this.actorRoundRepository.update(reroll.holder);
    }

    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action);
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    return updated;
  }

  /**
   * Workspace spec 076, decision B8: a critical is rolled again once it has a roll, before the attack is applied (checked
   * by the caller), and only once: the attacker needs a `critical-reroll` of kind `offense` against the target, or the
   * target one of kind `defense` against the attacker (`err-reroll-not-available`). Every critical of the attack shares
   * the roll (§9.8), so all of them take the new one.
   */
  static checkReroll(
    attack: ActionAttack,
    criticalKey: string,
    sourceActor: ActorRound | undefined,
    targetActor: ActorRound | undefined,
  ): CriticalRerollGrant {
    const critical = attack.results?.criticals?.find(each => each.key === criticalKey);
    const rolled = !!critical?.result && attack.roll?.criticalRolls?.get(criticalKey) !== undefined;
    if (!rolled) {
      throw new ValidationError(`Critical ${criticalKey} has no roll to roll again`, 'err-reroll-not-available', { reason: 'not-rolled' });
    }
    if (attack.results!.criticals!.some(each => !!each.rerolledBy)) {
      throw new ValidationError(`The criticals of ${attack.attackName} were already rolled again`, 'err-reroll-not-available', {
        reason: 'already-rerolled',
      });
    }
    const grant = findCriticalReroll(sourceActor, targetActor);
    if (!grant) {
      throw new ValidationError('Neither the attacker nor the target can roll this critical again', 'err-reroll-not-available', {
        reason: 'no-effect',
      });
    }
    return grant;
  }

  /**
   * Workspace spec 032, group C: the fighting style ability declared with the attack, or chosen now, changes the
   * criticals before they are rolled. Only once: the criticals already changed are not changed again.
   */
  private applyStyleOption(command: UpdateCriticalRollCommand, attack: ActionAttack, sourceActor: ActorRound | undefined): void {
    const criticals = attack.results!.criticals!;
    if (criticals.some(critical => critical.styleOption)) return;
    const declared = attack.modifiers.styleCriticalOption;
    if (command.styleOption && declared && command.styleOption !== declared) {
      throw new ValidationError(`The attack was declared with ${declared}`, 'err-style-critical-option');
    }
    const option = command.styleOption ?? declared;
    if (!option) return;
    checkStyleCriticalOption(sourceActor?.activeStyle, attack.attackName, option);
    applyStyleCriticalOption(criticals, option);
  }

  /** Actor rounds of the attacker and the target, for the rules that read their traits or effects. */
  private async readActors(
    action: Action,
    targetId: string | undefined,
  ): Promise<{ sourceActor: ActorRound | undefined; targetActor: ActorRound | undefined }> {
    const [sourceActor, targetActor] = await Promise.all([
      this.actorRoundRepository.findByActorIdAndRound(action.gameId, action.actorId, action.round),
      targetId ? this.actorRoundRepository.findByActorIdAndRound(action.gameId, targetId, action.round) : Promise.resolve(null),
    ]);
    return { sourceActor: sourceActor ?? undefined, targetActor: targetActor ?? undefined };
  }
}
