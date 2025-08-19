import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { NotFoundError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/entities/action.entity';
import * as actionRepository from '../../ports/out/action.repository';
import { GetActionQuery } from '../get-action.query';

@QueryHandler(GetActionQuery)
export class GetActionQueryHandler implements IQueryHandler<GetActionQuery, Action> {
  constructor(@Inject('ActionRepository') private readonly actionRepository: actionRepository.ActionRepository) {}

  async execute(query: GetActionQuery): Promise<Action> {
    const data = await this.actionRepository.findById(query.actionId);
    if (!data) {
      throw new NotFoundError('Action', query.actionId);
    }
    return data;
  }
}
