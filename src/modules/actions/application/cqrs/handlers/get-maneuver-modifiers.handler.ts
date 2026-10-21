import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import type { ActionRepository } from '../../ports/action.repository';
import { ManeuverContextService, ManeuverModifiersListing } from '../../services/maneuver/maneuver-context.service';
import { GetManeuverModifiersQuery } from '../queries/get-maneuver-modifiers.query';

/** Modifiers a declared maneuver can take: base ones of the actor, difficulty, light and the skill's catalog. */
@QueryHandler(GetManeuverModifiersQuery)
export class GetManeuverModifiersHandler implements IQueryHandler<GetManeuverModifiersQuery, ManeuverModifiersListing> {
  constructor(
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
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
