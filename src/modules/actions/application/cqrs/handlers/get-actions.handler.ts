import { Inject, Logger } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Page } from '../../../../shared/application/pagination/page.js';
import { Action } from '../../../domain/aggregates/action.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { ActionApStateService } from '../../services/action-ap-state.service.js';
import { GetActionsQuery } from '../queries/get-actions.query.js';
import { GAME_GUARD, type GameGuardPort } from '../../../../games/application/ports/game-guard.port.js';
import { GAME_REPOSITORY, type GameRepository } from '../../../../games/application/ports/game-repository.port.js';
import { readableGamesFilter } from '../../../../games/application/services/readable-games.js';

@QueryHandler(GetActionsQuery)
export class GetActionsQueryHandler implements IQueryHandler<GetActionsQuery, Page<Action>> {
  private readonly logger = new Logger(GetActionsQueryHandler.name);

  constructor(
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    private readonly apStateService: ActionApStateService,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(GAME_GUARD) private readonly gameGuard: GameGuardPort,
  ) {}

  async execute(query: GetActionsQuery): Promise<Page<Action>> {
    this.logger.debug('Finding actions with query: ', query.rsql);
    const filter = await readableGamesFilter(this.gameRepository, this.gameGuard, query.userId, query.roles);
    const page = await this.actionRepository.findByRsql(query.rsql, query.page, query.size, filter);
    await this.apStateService.refresh(page.content);
    return page;
  }
}
