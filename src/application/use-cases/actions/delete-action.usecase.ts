import { inject, injectable } from 'inversify';

import { Logger } from '@domain/ports/logger';
import { ActionRepository } from '@domain/ports/outbound/action.repository';

import { DeleteActionCommand } from '@application/commands/delete-action.command';
import { TYPES } from '@shared/types';
import { NotFoundError } from '../../../domain/errors/errors';

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
      throw new NotFoundError("Action", command.actionId);
    }
    await this.actionRepository.deleteById(command.actionId);
  }
}
