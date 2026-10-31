import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { type ItemPort, ITEM_PORT, type StrategicItem } from '../../../../strategic/application/ports/item.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { UseHerbCommand } from '../commands/use-herb.command.js';

export interface UseHerbResult {
  actorRound: ActorRound;
  item: Pick<StrategicItem, 'id' | 'itemTypeId' | 'name'>;
  /** Hits of the dose (the roll sent or rolled); none when the herb does not heal. */
  roll?: number;
  healed: number;
  stunRoundsRemoved: number;
}

/** A whole number of hits in the range of the herb. */
export const rollHerbHeal = (range: { min: number; max: number }, random: () => number = Math.random): number => {
  const min = Math.ceil(Math.min(range.min, range.max));
  const max = Math.floor(Math.max(range.min, range.max));
  return min + Math.floor(random() * (max - min + 1));
};

/**
 * A herb in combat (workspace spec 062): the herb of the character of the actor, read from strategic, heals its hits
 * (`effects.heal`) and removes stun rounds (`effects.stunRelief`, 999 all). As the antidotes of spec 042, tactical
 * spends no dose: the strategic inventory keeps the doses.
 */
@CommandHandler(UseHerbCommand)
export class UseHerbHandler implements ICommandHandler<UseHerbCommand, UseHerbResult> {
  private readonly logger = new Logger(UseHerbHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ITEM_PORT) private readonly itemPort: ItemPort,
  ) {}

  async execute(command: UseHerbCommand): Promise<UseHerbResult> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) throw new NotFoundError('Actor round', command.actorRoundId);
    const game = await this.gameRepository.findById(actorRound.gameId);
    game?.checkNotFinished();
    if (actorRound.actorType !== 'character') {
      throw new ValidationError('Only the actor of a character carries herbs', 'err-herb-not-held');
    }
    const item = await this.itemPort.findById(command.itemId);
    if (!item) throw new NotFoundError('Item', command.itemId, 'err-item-not-found');
    const herb = item.catalog?.features?.herb;
    if (item.category !== 'herb' || !herb) throw new ValidationError(`Item ${item.id} is not a herb`, 'err-item-not-herb');
    if (item.characterId !== actorRound.actorId) {
      throw new ValidationError(`The herb is not carried by ${actorRound.actorName}`, 'err-herb-not-held');
    }
    const heal = herb.effects?.heal && herb.effects.heal.max > 0 ? herb.effects.heal : null;
    const stunRelief = herb.effects?.stunRelief && herb.effects.stunRelief > 0 ? herb.effects.stunRelief : 0;
    if (!heal && !stunRelief) throw new ValidationError('The herb has no effect usable in combat', 'herb-without-effect');
    const roll = heal ? (command.roll ?? rollHerbHeal(heal)) : undefined;
    // The phase of the hits log, when the actor round is the one of the current round
    const phase = game && game.round === actorRound.round ? game.getEffectPhase() : undefined;
    const { healed, stunRoundsRemoved } = actorRound.useHerb({ hits: roll ?? 0, stunRounds: stunRelief }, phase);
    const updated = await this.actorRoundRepository.update(actorRound);
    return {
      actorRound: updated,
      item: { id: item.id, itemTypeId: item.itemTypeId, name: item.name },
      ...(roll !== undefined ? { roll } : {}),
      healed,
      stunRoundsRemoved,
    };
  }
}
