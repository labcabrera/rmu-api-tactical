import { Inject, Logger } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { type FinishPreview, TacticalGameOutcomeCalculator } from '../../../domain/services/tactical-game-outcome.calculator.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { GetFinishPreviewQuery } from '../queries/get-finish-preview.query.js';

/** The data of the finish dialog: the outcome the game would finish with and the characters at risk (spec 013, §3). */
@QueryHandler(GetFinishPreviewQuery)
export class GetFinishPreviewHandler implements IQueryHandler<GetFinishPreviewQuery, FinishPreview> {
  private readonly logger = new Logger(GetFinishPreviewHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
  ) {}

  async execute(query: GetFinishPreviewQuery): Promise<FinishPreview> {
    this.logger.debug(`Execute << ${query.gameId}`);
    const game = await this.gameRepository.findById(query.gameId);
    if (!game) throw new NotFoundError('Game', query.gameId);
    if (game.isFinished() && game.outcome) {
      return { characters: game.outcome.characters, atRisk: [] };
    }
    const actorRounds = await this.actorRoundRepository.findByGameId(game.id);
    return TacticalGameOutcomeCalculator.preview(game, actorRounds);
  }
}
