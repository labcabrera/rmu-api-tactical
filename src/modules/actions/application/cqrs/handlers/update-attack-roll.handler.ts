import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Action } from '../../../domain/aggregates/action.js';
import { ActionUpdatedEvent } from '../../../domain/events/action.events.js';
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

    const previousBreakage = !!attack.calculated?.breakageRoll;
    await this.combatAttackRollResolver.resolve({
      action,
      attack,
      sourceActor,
      targetActor,
      roll: command.roll,
    });

    // Raised when the roll is resolved; a repeated roll does not raise it again.
    if (attack.calculated?.breakageRoll && !previousBreakage) {
      sourceActor.addAttackBreakageAlert(attack.attackName);
      await this.actorRoundRepository.update(sourceActor);
    }

    action.updatedAt = new Date();

    const updated = await this.actionRepository.update(action);
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    return updated;
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
    action.checkValidRollDeclaration();
  }
}
