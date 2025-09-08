import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/entities/action.aggregate';
import type { ActionRepository } from '../../ports/action.repository';
import { GetActionQuery } from '../queries/get-action.query';

@QueryHandler(GetActionQuery)
export class GetActionQueryHandler implements IQueryHandler<GetActionQuery, Action> {
  constructor(@Inject('ActionRepository') private readonly actionRepository: ActionRepository) {}

  async execute(query: GetActionQuery): Promise<Action> {
    const data = await this.actionRepository.findById(query.actionId);
    if (!data) {
      throw new NotFoundError('Action', query.actionId);
    }
    return data;
  }
}
