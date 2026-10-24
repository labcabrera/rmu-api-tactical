import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { Action } from '../../../domain/aggregates/action.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { ActionApStateService } from '../../services/action-ap-state.service.js';
import { GetActionQuery } from '../queries/get-action.query.js';

@QueryHandler(GetActionQuery)
export class GetActionQueryHandler implements IQueryHandler<GetActionQuery, Action> {
  constructor(
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    private readonly apStateService: ActionApStateService,
  ) {}

  async execute(query: GetActionQuery): Promise<Action> {
    const data = await this.actionRepository.findById(query.actionId);
    if (!data) throw new NotFoundError('Action', query.actionId);
    await this.apStateService.refresh([data]);
    return data;
  }
}
