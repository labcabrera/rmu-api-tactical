import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import type { StrategicItem } from '../../../../strategic/application/ports/item.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { HerbUseService } from '../../services/herb-use.service.js';
import { UseHerbCommand } from '../commands/use-herb.command.js';

export { rollHerbHeal } from '../../services/herb-use.service.js';

export interface UseHerbResult {
  actorRound: ActorRound;
  item: Pick<StrategicItem, 'id' | 'itemTypeId' | 'name'>;
  /** Hits of the dose (the roll sent or rolled); none when the herb does not heal. */
  roll?: number;
  healed: number;
  stunRoundsRemoved: number;
}

/**
 * A herb in combat (workspace spec 062), the game master's adjustment without AP: the herb of the character of the
 * actor heals the actor. Since workspace spec 068 the unit is recorded in `itemsConsumed` (decision 7); in combat the
 * actor declares a `use_item` action.
 */
@CommandHandler(UseHerbCommand)
export class UseHerbHandler implements ICommandHandler<UseHerbCommand, UseHerbResult> {
  private readonly logger = new Logger(UseHerbHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly herbs: HerbUseService,
  ) {}

  async execute(command: UseHerbCommand): Promise<UseHerbResult> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) throw new NotFoundError('Actor round', command.actorRoundId);
    const game = await this.gameRepository.findById(actorRound.gameId);
    game?.checkNotFinished();
    // The phase of the hits log, when the actor round is the one of the current round
    const phase = game && game.round === actorRound.round ? game.getEffectPhase() : undefined;
    const use = await this.herbs.use(actorRound, actorRound, command.itemId, command.roll, phase);
    const updated = await this.actorRoundRepository.update(actorRound);
    return { actorRound: updated, ...use };
  }
}
