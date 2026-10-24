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
import { ActionUpdatedEvent } from '../../../domain/events/action.events.js';
import type { AttackLocation } from '../../../domain/value-objects/attack-location.vo.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { type CriticalTablePort, CRITICAL_TABLE_PORT } from '../../ports/critical-table.port.js';
import { CombatProcessor } from '../../services/combat/index.js';
import { UpdateCriticalRollCommand } from '../commands/update-critical-roll.command.js';
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

    const criticalRolls = attack.roll!.criticalRolls;
    attack.roll!.criticalRolls = criticalRolls instanceof Map ? criticalRolls : new Map(Object.entries(criticalRolls || {}));
    // §9.8: every critical of the attack uses the same roll and the same location. The first roll resolves all of
    // them; a different roll for another one is rejected.
    const previous = [...attack.roll!.criticalRolls.values()].find(roll => roll !== undefined && roll !== null);
    if (previous !== undefined && previous !== command.roll) {
      throw new ValidationError(
        `The criticals of attack ${command.attackName} share the roll ${previous}, not ${command.roll}`,
        'err-critical-roll-mismatch',
      );
    }
    let location = attack.calculated?.location;
    const { sourceActor, targetActor } = await this.readActors(action, attack.modifiers.targetId);
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
      location = location ?? toAttackLocation(each.result.location);
    }
    action.refreshAttackStatuses();

    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action.id, action);
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    return updated;
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
