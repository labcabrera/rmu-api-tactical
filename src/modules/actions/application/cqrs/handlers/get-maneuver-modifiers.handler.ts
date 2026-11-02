import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { ManeuverContextService, type ManeuverModifiersListing } from '../../services/maneuver/maneuver-context.service.js';
import { GetManeuverModifiersQuery } from '../queries/get-maneuver-modifiers.query.js';

/** Modifiers a declared maneuver can take: base ones of the actor, difficulty, light and the skill's catalog. */
@QueryHandler(GetManeuverModifiersQuery)
export class GetManeuverModifiersHandler implements IQueryHandler<GetManeuverModifiersQuery, ManeuverModifiersListing> {
  constructor(
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly maneuverContextService: ManeuverContextService,
  ) {}

  async execute(query: GetManeuverModifiersQuery): Promise<ManeuverModifiersListing> {
    const action = await this.actionRepository.findById(query.actionId);
    if (!action) throw new NotFoundError('Action', query.actionId);
    if (action.actionType !== 'maneuver' || !action.maneuver) {
      throw new ValidationError('Action is not a maneuver action');
    }
    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);

    const context = await this.maneuverContextService.load(action, game, {
      skillId: query.skillId,
      specialization: query.specialization,
      actionPoints: action.status === 'completed' ? action.actionPoints : undefined,
    });
    return this.maneuverContextService.listing(context, action);
  }
}
