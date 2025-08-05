import { ActionRepository } from "@domain/ports/action.repository";
import { Logger } from "@domain/ports/logger";

import { DeleteActionCommand } from "@application/commands/delete-action.command";

export class DeleteActionUseCase {
  constructor(
    private readonly actionRepository: ActionRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: DeleteActionCommand): Promise<void> {
    this.logger.info(
      `DeleteActionUseCase: Deleting action ${command.actionId}`,
    );
    await this.actionRepository.delete(command.actionId);
  }
}
