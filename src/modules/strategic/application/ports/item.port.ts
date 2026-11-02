import type { ItemCoating, ItemModifier } from '../../../actor-rounds/domain/value-objects/actor-round-item.vo.js';

/** A strategic item of a character, as the strategic API returns it (spec 019). */
export interface StrategicItem {
  id: string;
  characterId: string | null;
  itemTypeId: string;
  name: string;
  category: string;
  carried: boolean;
  weapon: object | null;
  armor: { slot?: string; at?: number } | null;
  shield: { db?: number; blockCount?: number } | null;
  amount?: number | null;
  info?: { strength?: number | null; stackable?: boolean };
  /** Missing in strategic versions before spec 019. */
  modifiers?: ItemModifier[];
  /** Poison on the weapon (workspace spec 042). */
  coating?: ItemCoating | null;
  /** Copy of the catalog type (spec 023); workspace spec 062 reads the herb block. */
  catalog?: { features?: { herb?: StrategicHerb | null } | null } | null;
}

/** What tactical reads of the herb block of the catalog (workspace spec 062). */
export interface StrategicHerb {
  group?: string;
  magical?: boolean;
  effects?: {
    heal?: { min: number; max: number } | null;
    /** Rounds of stun removed (999: all). */
    stunRelief?: number | null;
  } | null;
}

export interface ItemPort {
  /** `GET /items?q=characterId==<id>`. */
  findByCharacterId(characterId: string): Promise<StrategicItem[]>;

  /** `GET /items/:id` (workspace spec 062); undefined when strategic has no such item. */
  findById(itemId: string): Promise<StrategicItem | undefined>;
}

export const ITEM_PORT = Symbol('ItemPort');
