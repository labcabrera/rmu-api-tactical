import { inject, injectable } from 'inversify';

import { Action } from '@domain/entities/action.entity';
import { Page } from '@domain/entities/page.entity';
import { Logger } from '@domain/ports/logger';
import { ActionRepository } from '@domain/ports/outbound/action.repository';

import { TYPES } from '@shared/types';

@injectable()
export class FindActionsUseCase {
  constructor(
    @inject(TYPES.ActionRepository)
    private readonly actionRepository: ActionRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(rsql: string, page: number, size: number): Promise<Page<Action>> {
    this.logger.info(`FindActionByIdUseCase: Finding actions`);
    return this.actionRepository.findByRsql(rsql, page, size);
  }
}
