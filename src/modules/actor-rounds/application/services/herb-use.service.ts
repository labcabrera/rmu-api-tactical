import { Inject, Injectable } from '@nestjs/common';
import { type ItemPort, ITEM_PORT, type StrategicItem } from '../../../strategic/application/ports/item.port.js';
import { NotFoundError, ValidationError } from '../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../domain/aggregates/actor-round.js';

/** A whole number of hits in the range of the herb. */
export const rollHerbHeal = (range: { min: number; max: number }, random: () => number = Math.random): number => {
  const min = Math.ceil(Math.min(range.min, range.max));
  const max = Math.floor(Math.max(range.min, range.max));
  return min + Math.floor(random() * (max - min + 1));
};

export interface HerbUse {
  item: Pick<StrategicItem, 'id' | 'itemTypeId' | 'name'>;
  /** Hits of the dose (the roll sent or rolled); none when the herb does not heal. */
  roll?: number;
  healed: number;
  stunRoundsRemoved: number;
}

/**
 * A dose of a healing item of a character (workspace spec 062): the herb, read from strategic, heals its hits
 * (`effects.heal`) and removes stun rounds (`effects.stunRelief`, 999 all) of the target. Workspace spec 068,
 * decision 7: the carrier records the unit as consumed (`itemsConsumed`), which strategic spends when it applies the
 * outcome of the game. Used by `POST herbs` and by the `use_item` actions.
 */
@Injectable()
export class HerbUseService {
  constructor(@Inject(ITEM_PORT) private readonly itemPort: ItemPort) {}

  async use(carrier: ActorRound, target: ActorRound, itemId: string, roll: number | null | undefined, phase?: number): Promise<HerbUse> {
    if (carrier.actorType !== 'character') {
      throw new ValidationError('Only the actor of a character carries herbs', 'err-herb-not-held');
    }
    const item = await this.itemPort.findById(itemId);
    if (!item) throw new NotFoundError('Item', itemId, 'err-item-not-found');
    const herb = item.catalog?.features?.herb;
    if (item.category !== 'herb' || !herb) throw new ValidationError(`Item ${item.id} is not a herb`, 'err-item-not-herb');
    if (item.characterId !== carrier.actorId) {
      throw new ValidationError(`The herb is not carried by ${carrier.actorName}`, 'err-herb-not-held');
    }
    const heal = herb.effects?.heal && herb.effects.heal.max > 0 ? herb.effects.heal : null;
    const stunRelief = herb.effects?.stunRelief && herb.effects.stunRelief > 0 ? herb.effects.stunRelief : 0;
    if (!heal && !stunRelief) throw new ValidationError('The herb has no effect usable in combat', 'herb-without-effect');
    const hits = heal ? (roll ?? rollHerbHeal(heal)) : undefined;
    const { healed, stunRoundsRemoved } = target.useHerb({ hits: hits ?? 0, stunRounds: stunRelief }, phase);
    carrier.recordItemConsumed(item.id, 1);
    return {
      item: { id: item.id, itemTypeId: item.itemTypeId, name: item.name },
      ...(hits !== undefined ? { roll: hits } : {}),
      healed,
      stunRoundsRemoved,
    };
  }
}
