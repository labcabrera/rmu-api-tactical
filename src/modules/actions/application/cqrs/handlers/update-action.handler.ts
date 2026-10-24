import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { Action } from '../../../domain/aggregates/action';
import { ActionUpdatedEvent } from '../../../domain/events/action.events';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port';
import { ActionApStateService } from '../../services/action-ap-state.service';
import { UpdateActionCommand } from '../commands/update-action.command';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port';

/** `PATCH /v1/actions/:id`: only the description changes. */
@CommandHandler(UpdateActionCommand)
export class UpdateActionHandler implements ICommandHandler<UpdateActionCommand, Action> {
  private readonly logger = new Logger(UpdateActionHandler.name);

  constructor(
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    private readonly apStateService: ActionApStateService,
  ) {}

  async execute(command: UpdateActionCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);
    (await this.gameRepository.findById(action.gameId))?.checkNotFinished();
    if (command.description !== undefined) {
      action.description = command.description;
    }
    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action.id, { description: action.description, updatedAt: action.updatedAt });
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    await this.apStateService.refresh([updated]);
    return updated;
  }
}
