import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { Action } from '../../../domain/aggregates/action';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port';
import { ActionApStateService } from '../../services/action-ap-state.service';
import { GetActionQuery } from '../queries/get-action.query';

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
