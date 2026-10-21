import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/actor-round.repository';
import { NotFoundError } from '../../../../shared/domain/errors';
import { FinishPreview, TacticalGameOutcomeCalculator } from '../../../domain/services/tactical-game-outcome.calculator';
import type { GameRepository } from '../../ports/game.repository';
import { GetFinishPreviewQuery } from '../queries/get-finish-preview.query';

/** The data of the finish dialog: the outcome the game would finish with and the characters at risk (spec 013, §3). */
@QueryHandler(GetFinishPreviewQuery)
export class GetFinishPreviewHandler implements IQueryHandler<GetFinishPreviewQuery, FinishPreview> {
  private readonly logger = new Logger(GetFinishPreviewHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
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
