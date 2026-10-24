import type { LightManeuverModifier } from './light-maneuver-modifier.vo.js';
import type { ManeuverType } from './maneuver-type.vo.js';

/** Range of action points of a maneuver (Table 8-1). */
export interface ManeuverActionPoints {
  min: number;
  max: number;
}

/**
 * How the result of a maneuver reads (workspace spec 022, decisions 11-12, from core's profile): `standard` the result
 * table of the maneuver type; `morale` the morale table of core's psychology tables (Leadership); `price` a percent
 * maneuver opposed by the seller whose result is a price (Trading).
 */
export type ManeuverResultKind = 'standard' | 'morale' | 'price';

/**
 * Maneuver profile of a skill, as core resolves it (the skill's own fields over its category's). Read from core at
 * runtime: the values are catalog data, not code.
 */
export interface SkillManeuverProfile {
  defaultType: ManeuverType;
  /** Absolute maneuver table (`generic` when the skill has no table of its own). */
  resultTable: string;
  /** The maneuver needs freedom of movement: the armor maneuver penalty and the encumbrance penalty apply. */
  movement: boolean;
  light: LightManeuverModifier;
  /** -25 per AP below `max` when present. */
  actionPoints?: ManeuverActionPoints;
  /** `standard` when core does not say. */
  resultKind?: ManeuverResultKind;
}

/** Profile used when core has none for the skill. */
export const DEFAULT_MANEUVER_PROFILE: SkillManeuverProfile = {
  defaultType: 'absolute',
  resultTable: 'generic',
  movement: false,
  light: 'none',
};

/** Profile of the movement roll (§5.3): it always needs freedom of movement. */
export const MOVEMENT_MANEUVER_PROFILE: SkillManeuverProfile = {
  defaultType: 'percent',
  resultTable: 'generic',
  movement: true,
  light: 'helpful',
};

/** A skill as the core catalog returns it. */
export interface CatalogSkill {
  id: string;
  categoryId: string;
  maneuver: SkillManeuverProfile;
}

export type ManeuverModifierType = 'flag' | 'choice' | 'number';

export interface ManeuverModifierOption {
  key: string;
  value: number;
}

/** A skill-specific maneuver modifier of the core catalog. */
export interface ManeuverModifierDefinition {
  id: string;
  key: string;
  scope: { skillIds?: string[]; categoryIds?: string[] };
  type: ManeuverModifierType;
  /** `flag`: value when set. */
  value?: number;
  /** `choice`: the options. */
  options?: ManeuverModifierOption[];
  /** `number`: value per unit, and the range of units. */
  perUnit?: number;
  min?: number;
  max?: number;
  description?: string;
}

/** What the client chose for a catalog modifier: the option key, the flag or the number of units. */
export type ManeuverModifierSelection = string | boolean | number;
