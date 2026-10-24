import type { ItemModifier } from '../../../actor-rounds/domain/value-objects/actor-round-item.vo.js';

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
}

export interface ItemPort {
  /** `GET /items?q=characterId==<id>`. */
  findByCharacterId(characterId: string): Promise<StrategicItem[]>;
}

export const ITEM_PORT = Symbol('ItemPort');
