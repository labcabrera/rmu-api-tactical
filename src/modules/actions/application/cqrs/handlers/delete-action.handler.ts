import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors';
import type { ActionEventProducer } from '../../ports/action-event-producer';
import type { ActionRepository } from '../../ports/action.repository';
import { DeleteActionCommand } from '../commands/delete-action.command';

@CommandHandler(DeleteActionCommand)
export class DeleteActionHandler implements ICommandHandler<DeleteActionCommand> {
  private readonly logger = new Logger(DeleteActionHandler.name);

  constructor(
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('ActionEventProducer') private readonly actionEventProducer: ActionEventProducer,
  ) {}

  async execute(command: DeleteActionCommand): Promise<void> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) {
      throw new NotFoundError('Action', command.actionId);
    }
    await this.actionRepository.deleteById(command.actionId);
    await this.actionEventProducer.deleted(action);
  }
}
