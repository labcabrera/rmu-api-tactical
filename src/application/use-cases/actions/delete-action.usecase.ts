import { inject, injectable } from 'inversify';

import { NotFoundError } from '@domain/errors/errors';

import { DeleteActionCommand } from '@application/commands/delete-action.command';
import { Logger } from '@application/ports/logger';
import { ActionRepository } from '@application/ports/outbound/action.repository';
import { TYPES } from '@shared/types';

@injectable()
export class DeleteActionUseCase {
  constructor(
    @inject(TYPES.ActionRepository)
    private readonly actionRepository: ActionRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(command: DeleteActionCommand): Promise<void> {
    this.logger.info(`DeleteActionUseCase: Deleting action ${command.actionId}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) {
      throw new NotFoundError('Action', command.actionId);
    }
    await this.actionRepository.deleteById(command.actionId);
  }
}
