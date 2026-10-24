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
import { type FumbleTablePort, FUMBLE_TABLE_PORT } from '../../ports/fumble-table.port.js';
import { CombatProcessor } from '../../services/combat/index.js';
import { UpdateFumbleRollCommand } from '../commands/update-fumble-roll.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(UpdateFumbleRollCommand)
export class UpdateFumbleRollHandler implements ICommandHandler<UpdateFumbleRollCommand, Action> {
  private readonly logger = new Logger(UpdateFumbleRollHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(FUMBLE_TABLE_PORT) private readonly fumbleTablePort: FumbleTablePort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    private readonly combatProcessor: CombatProcessor,
  ) {}

  async execute(command: UpdateFumbleRollCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);

    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);

    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);
    game.checkNotFinished();

    const attack = action.getAttackByName(command.attackName);
    if (!attack.results?.fumble) {
      throw new ValidationError(`Attack ${command.attackName} has no pending fumble`);
    }

    const sourceActor = await this.actorRoundRepository.findByActorIdAndRound(action.gameId, action.actorId, action.round);
    if (!sourceActor) throw new NotFoundError('ActorRound', action.actorId);
    const sourceAttack = sourceActor.attacks?.find(a => a.attackName === command.attackName);
    if (!sourceAttack) {
      throw new ValidationError(`Attack ${command.attackName} not found on actor ${action.actorId}`);
    }

    const ctx = await this.combatProcessor.runPhase('fumbleRoll', {
      action,
      attack,
      fumbleRoll: command.fumbleRoll,
      sourceActor,
      sourceAttack,
      trace: [],
    });

    // The raw roll is stored; the adapter clamps the one looked up to the table range.
    attack.roll!.fumbleRoll = command.fumbleRoll;
    attack.results.fumble = await this.fumbleTablePort.lookup({
      fumbleTable: sourceAttack.fumbleTable,
      roll: ctx.fumbleRoll ?? command.fumbleRoll,
    });
    action.refreshAttackStatuses();

    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action);
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    return updated;
  }
}
