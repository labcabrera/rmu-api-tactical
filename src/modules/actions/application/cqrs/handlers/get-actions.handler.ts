import { Inject, Logger } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Page } from '../../../../shared/application/pagination/page.js';
import { Action } from '../../../domain/aggregates/action.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { ActionApStateService } from '../../services/action-ap-state.service.js';
import { GetActionsQuery } from '../queries/get-actions.query.js';

@QueryHandler(GetActionsQuery)
export class GetActionsQueryHandler implements IQueryHandler<GetActionsQuery, Page<Action>> {
  private readonly logger = new Logger(GetActionsQueryHandler.name);

  constructor(
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    private readonly apStateService: ActionApStateService,
  ) {}

  async execute(query: GetActionsQuery): Promise<Page<Action>> {
    this.logger.debug('Finding actions with query: ', query.rsql);
    const page = await this.actionRepository.findByRsql(query.rsql, query.page, query.size);
    await this.apStateService.refresh(page.content);
    return page;
  }
}
