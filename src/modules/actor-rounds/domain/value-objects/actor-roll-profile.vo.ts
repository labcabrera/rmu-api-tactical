import {
  ABSOLUTE_DISASTER,
  ABSOLUTE_EASE,
  ActorRoundTrait,
  DRAMATIC_LUCK,
  LUCKY,
  SPASM_TRAIT,
  TERRIBLE_LUCK,
  UNUSUAL_LUCK,
} from './actor-round-trait.vo.js';

/** First die of an open-ended roll that opens it high (96-100) and last one that opens it low (01-05), §5.1. */
export const DEFAULT_HIGH_FROM = 96;
export const DEFAULT_LOW_TO = 5;

/** Absolute Ease of a skill category: its tier and whether the actor has the Absolute Disaster flaw. */
export interface AbsoluteEaseEntry {
  categoryId: string;
  tier: number;
  disaster: boolean;
}

/**
 * How the actor's talents change its rolls (workspace spec 076, decision B10, §2.8). Computed from its traits, never
 * stored:
 * - `highFrom`: an open-ended roll opens high from this die (96 less the tiers of Lucky and Dramatic Luck);
 * - `lowTo`: it opens low up to this die (5 plus the tier of Dramatic Luck);
 * - `unusualLuck`: a natural 66 of an unopposed absolute maneuver is a success;
 * - `terribleLuck`: a natural 01 raises a `terrible-luck` alert;
 * - `spasm`: a natural 66 gives a spasm;
 * - `absoluteEase`: the skill categories whose successes (and, with Absolute Disaster, failures) become absolute.
 */
export interface ActorRollProfile {
  highFrom: number;
  lowTo: number;
  unusualLuck: boolean;
  terribleLuck: boolean;
  spasm: boolean;
  absoluteEase: AbsoluteEaseEntry[];
}

export const DEFAULT_ROLL_PROFILE: ActorRollProfile = {
  highFrom: DEFAULT_HIGH_FROM,
  lowTo: DEFAULT_LOW_TO,
  unusualLuck: false,
  terribleLuck: false,
  spasm: false,
  absoluteEase: [],
};

/** Absolute Ease by tier: a success is absolute from this total (tier 3: always, `null`). */
const EASE_SUCCESS_FROM: Record<number, number | null> = { 1: 151, 2: 126, 3: null };
/** Absolute Disaster by tier: a failure is absolute up to this total (tier 3: always, `null`). */
const DISASTER_FAILURE_TO: Record<number, number | null> = { 1: 25, 2: 50, 3: null };
const MAX_EASE_TIER = 3;

/** The roll profile of an actor with these traits. */
export const rollProfileOf = (traits: ActorRoundTrait[] | undefined): ActorRollProfile => {
  const lucky = ActorRoundTrait.tierOf(traits, LUCKY);
  const dramatic = ActorRoundTrait.tierOf(traits, DRAMATIC_LUCK);
  const disaster = ActorRoundTrait.tierOf(traits, ABSOLUTE_DISASTER) > 0;
  const ease = new Map<string, number>();
  (traits || [])
    .filter(trait => trait.traitId === ABSOLUTE_EASE && !!trait.specialization)
    .forEach(trait => ease.set(trait.specialization!, Math.max(ease.get(trait.specialization!) ?? 0, trait.tier || 1)));
  return {
    highFrom: DEFAULT_HIGH_FROM - lucky - dramatic,
    lowTo: DEFAULT_LOW_TO + dramatic,
    unusualLuck: ActorRoundTrait.tierOf(traits, UNUSUAL_LUCK) > 0,
    terribleLuck: ActorRoundTrait.tierOf(traits, TERRIBLE_LUCK) > 0,
    spasm: ActorRoundTrait.tierOf(traits, SPASM_TRAIT) > 0,
    absoluteEase: [...ease.entries()].map(([categoryId, tier]) => ({ categoryId, tier: Math.min(tier, MAX_EASE_TIER), disaster })),
  };
};

/**
 * Absolute Ease (and Absolute Disaster) on the result of an absolute maneuver of a skill of that category: a success
 * from the tier's total becomes an absolute success, and with the flaw a failure up to the tier's total an absolute
 * failure. Undefined when the result does not change.
 */
export const absoluteEaseResult = (entry: AbsoluteEaseEntry | undefined, result: string | undefined, total: number): string | undefined => {
  if (!entry) {
    return undefined;
  }
  if (result === 'success') {
    const from = EASE_SUCCESS_FROM[entry.tier];
    return from === null || total >= from ? 'absolute-success' : undefined;
  }
  if (result === 'failure' && entry.disaster) {
    const to = DISASTER_FAILURE_TO[entry.tier];
    return to === null || total <= to ? 'absolute-failure' : undefined;
  }
  return undefined;
};
