import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Page } from '../../../../shared/domain/entities/page.entity';
import { Action } from '../../../domain/aggregates/action.aggregate';
import type { ActionRepository } from '../../ports/action.repository';
import { GetActionsQuery } from '../queries/get-actions.query';

@QueryHandler(GetActionsQuery)
export class GetActionsQueryHandler implements IQueryHandler<GetActionsQuery, Page<Action>> {
  private readonly logger = new Logger(GetActionsQueryHandler.name);

  constructor(@Inject('ActionRepository') private readonly actionRepository: ActionRepository) {}

  async execute(query: GetActionsQuery): Promise<Page<Action>> {
    this.logger.debug('Finding actions with query: ', query.rsql);
    return await this.actionRepository.findByRsql(query.rsql, query.page, query.size);
  }
}
