import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { ManeuverContextService, type ManeuverModifiersListing } from '../../services/maneuver/maneuver-context.service.js';
import { GetManeuverModifiersQuery } from '../queries/get-maneuver-modifiers.query.js';
import { FEAT_OF_STRENGTH } from '../../../domain/value-objects/maneuver-purpose.vo.js';

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
      purpose: query.choices.purpose,
    });
    const listing = this.maneuverContextService.listing(context, action);
    // Workspace spec 079, block B: the lines of the similar and complementary skills, and the feat of strength
    const { similarity, complementary, featOfStrength } = query.choices;
    if (similarity || complementary?.length) {
      listing.aids = await this.maneuverContextService.skillAids(context, action, { similarity, complementary });
    }
    if (query.choices.purpose === FEAT_OF_STRENGTH) {
      listing.featOfStrength = this.maneuverContextService.featOfStrengthListing(context, featOfStrength);
    }
    return listing;
  }
}
