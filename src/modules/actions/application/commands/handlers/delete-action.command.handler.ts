import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError } from '../../../../shared/domain/errors';
import * as actionRepository from '../../ports/out/action.repository';
import { DeleteActionCommand } from '../delete-action.command';

@CommandHandler(DeleteActionCommand)
export class DeleteActionCommandHandler implements ICommandHandler<DeleteActionCommand> {
  constructor(@Inject('ActionRepository') private readonly actionRepository: actionRepository.ActionRepository) {}

  async execute(command: DeleteActionCommand): Promise<void> {
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) {
      throw new NotFoundError('Action', command.actionId);
    }
    await this.actionRepository.deleteById(command.actionId);
  }
}
