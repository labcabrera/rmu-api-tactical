import { inject, injectable } from 'inversify';

import { Logger } from "@domain/ports/logger";
import { ActionRepository } from "@domain/ports/outbound/action.repository";

import { DeleteActionCommand } from "@application/commands/delete-action.command";
import { TYPES } from '@shared/types';

@injectable()
export class DeleteActionUseCase {
  constructor(
    @inject(TYPES.ActionRepository) private readonly actionRepository: ActionRepository,
    @inject(TYPES.Logger) private readonly logger: Logger,
  ) {}

  async execute(command: DeleteActionCommand): Promise<void> {
    this.logger.info(
      `DeleteActionUseCase: Deleting action ${command.actionId}`,
    );
    await this.actionRepository.delete(command.actionId);
  }
}
