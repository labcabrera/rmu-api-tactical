import type { AttackLocation } from '../../../actions/domain/value-objects/attack-location.vo.js';

/** Kind of modifier of an item, as in the strategic items (spec 019, decision 2). */
export type ItemModifierType = 'breakage' | 'quality' | 'custom';

/** Uses of the item a modifier applies to. */
export type ItemModifierTarget = 'all' | 'breakage' | 'attack' | 'defense' | 'maneuver';

export interface ItemModifierSource {
  kind: 'tactical' | 'manual';
  tacticalGameId?: string;
  tacticalGameName?: string;
  round?: number;
  actionId?: string;
}

/** A modifier of an item: the same uuid in the tactical game and in the strategic item once applied. */
export interface ItemModifier {
  id: string;
  type: ItemModifierType;
  value: number;
  appliesTo: ItemModifierTarget;
  broken?: boolean;
  /** Damage that does not last after the game (an unmodified 66 on a failure): never applied to the strategic item. */
  temporary?: boolean;
  source?: ItemModifierSource;
  description?: string;
  createdAt: string;
}

export interface ItemCondition {
  /** Sum of the breakage modifiers, never above 0. */
  breakagePenalty: number;
  broken: boolean;
}

export type ActorRoundItemKind = 'weapon' | 'shield' | 'armor' | 'other';

/** Equipment slots of the strategic characters. */
export type ActorRoundItemSlot = 'mainHand' | 'offHand' | 'body' | 'head' | 'arms' | 'legs';

/**
 * An item of the actor in the game (spec 019, §2): an equipped or carried item of its character, with the modifiers
 * it brought and the ones of the game.
 */
export interface ActorRoundItem {
  itemId: string;
  name: string;
  itemTypeId?: string;
  kind: ActorRoundItemKind;
  slot?: ActorRoundItemSlot;
  /** Inherent strength for the breakage checks; null when unknown (the game master gives it). */
  strength: number | null;
  /** Modifiers it brought and the ones of the game. */
  modifiers: ItemModifier[];
  /** The ones it brought: the strategic sheet already counts them. */
  startModifierIds: string[];
  /** Armor: the AT of its area when the game started. Shield: its DB then. */
  baseValue?: number;
}

/** Breakage damage beyond which an armor piece leaves its area unprotected (§6.1). */
export const UNPROTECTED_ARMOR_PENALTY = -50;

/** AT of an unprotected area. */
export const UNARMORED_AT = 1;

/** Decision 11: the armor slot of each location of the attacks. */
const LOCATION_SLOTS: Record<AttackLocation, ActorRoundItemSlot> = {
  head: 'head',
  chest: 'body',
  abdomen: 'body',
  arms: 'arms',
  legs: 'legs',
};

export const ActorRoundItems = {
  condition(modifiers: ItemModifier[] | undefined): ItemCondition {
    const breakage = (modifiers || []).filter(modifier => modifier.type === 'breakage');
    const sum = breakage.reduce((total, modifier) => total + (modifier.value || 0), 0);
    return { breakagePenalty: Math.min(0, sum), broken: breakage.some(modifier => !!modifier.broken) };
  },

  /** The breakage damage taken in the game: what the strategic sheet does not count yet. */
  gameCondition(item: ActorRoundItem): ItemCondition {
    const start = ActorRoundItems.condition(item.modifiers.filter(modifier => item.startModifierIds.includes(modifier.id)));
    const now = ActorRoundItems.condition(item.modifiers);
    return { breakagePenalty: now.breakagePenalty - start.breakagePenalty, broken: now.broken && !start.broken };
  },

  /** Quality and other modifiers of the item for its breakage checks. */
  breakageBonus(item: ActorRoundItem): number {
    return item.modifiers
      .filter(modifier => modifier.type !== 'breakage' && (modifier.appliesTo === 'all' || modifier.appliesTo === 'breakage'))
      .reduce((total, modifier) => total + (modifier.value || 0), 0);
  },

  isUnprotected(condition: ItemCondition): boolean {
    return condition.broken || condition.breakagePenalty < UNPROTECTED_ARMOR_PENALTY;
  },

  slotOf(location: AttackLocation | undefined): ActorRoundItemSlot | undefined {
    return location ? LOCATION_SLOTS[location] : undefined;
  },

  copy(item: ActorRoundItem): ActorRoundItem {
    return {
      ...item,
      modifiers: item.modifiers.map(modifier => ({ ...modifier, ...(modifier.source ? { source: { ...modifier.source } } : {}) })),
      startModifierIds: [...item.startModifierIds],
    };
  },
};
