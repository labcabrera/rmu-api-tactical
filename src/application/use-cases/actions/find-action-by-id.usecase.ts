import { Logger } from "@domain/ports/logger";

import { Action } from "../../../domain/entities/action.entity";
import { ActionRepository } from "../../../domain/ports/outbound/action.repository";

export class FindActionByIdUseCase {
  constructor(
    private readonly actionRepository: ActionRepository,
    private readonly logger: Logger,
  ) {}

  async execute(actionId: string): Promise<Action> {
    this.logger.info(`FindActionByIdUseCase: Finding action << ${actionId}`);
    return this.actionRepository.findById(actionId);
  }
}
