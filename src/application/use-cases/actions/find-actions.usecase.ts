import { Logger } from "@domain/ports/logger";

import { Action } from "../../../domain/entities/action.entity";
import { Page } from "../../../domain/entities/page.entity";
import { ActionRepository } from "../../../domain/ports/action.repository";
import { ActionQuery } from "../../../domain/queries/action.query";

export class FindActionsUseCase {
  constructor(
    private readonly actionRepository: ActionRepository,
    private readonly logger: Logger,
  ) {}

  async execute(query: ActionQuery): Promise<Page<Action>> {
    this.logger.info(`FindActionByIdUseCase: Finding actions`);
    return this.actionRepository.find(query);
  }
}
