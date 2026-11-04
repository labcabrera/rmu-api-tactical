import type { LightManeuverModifier } from './light-maneuver-modifier.vo.js';

export type LightType = 'no_shadows' | 'light_shadows' | 'medium_shadows' | 'heavy_shadows' | 'dark' | 'extremely_dark' | 'pitch_black';

/** The levels from the brightest to the darkest. */
export const LIGHT_TYPES: LightType[] = [
  'no_shadows',
  'light_shadows',
  'medium_shadows',
  'heavy_shadows',
  'dark',
  'extremely_dark',
  'pitch_black',
];

/** One level of Table 15-7, with the values where sight is required: the penalty and the one with Nightvision. */
export interface LightLevel {
  penalty: number;
  nightvision: number;
}

/** Table 15-7 (§15.7): where sight only helps, half the value. */
export const LIGHT_TABLE: Record<LightType, LightLevel> = {
  no_shadows: { penalty: 0, nightvision: 0 },
  light_shadows: { penalty: -10, nightvision: 0 },
  medium_shadows: { penalty: -20, nightvision: 0 },
  heavy_shadows: { penalty: -30, nightvision: 0 },
  dark: { penalty: -50, nightvision: -10 },
  extremely_dark: { penalty: -70, nightvision: -30 },
  pitch_black: { penalty: -100, nightvision: -100 },
};

/** The helpful values of Table 15-7 (half the penalty), by level. */
export const LIGHT_MAP: Map<LightType, number> = new Map(LIGHT_TYPES.map(light => [light, LIGHT_TABLE[light].penalty / 2]));

export const isLightType = (value: unknown): value is LightType => typeof value === 'string' && LIGHT_TYPES.includes(value as LightType);

/** How the actor sees: Nightvision uses its column, Darkvision (when the target is within its range) sees as in daylight. */
export interface VisionAbilities {
  nightvision?: boolean;
  withinDarkvision?: boolean;
}

/**
 * Light modifier of a maneuver (Table 15-7): the full value where sight is required, half where it helps, and the
 * half value with the opposite sign where darkness helps (hiding). The vision talents of the actor change the first two,
 * not hiding (it is the darkness around the one who hides).
 */
export function lightModifierValue(light: LightType, usage: LightManeuverModifier, vision: VisionAbilities = {}): number {
  const level = LIGHT_TABLE[light];
  if (usage === 'none') return 0;
  if (usage === 'hiding') return 0 - level.penalty / 2;
  const full = vision.withinDarkvision ? 0 : vision.nightvision ? level.nightvision : level.penalty;
  return usage === 'required' ? full : full / 2;
}

/** Light Sensitivity: -25 per tier in bright light, 25, 50 and 75 less in the next three levels. */
const LIGHT_SENSITIVITY_PER_TIER = -25;
const LIGHT_SENSITIVITY_REDUCTION_PER_LEVEL = 25;
const LIGHT_SENSITIVITY_LEVELS = 4;

/** Penalty of Light Sensitivity of `tier` in the light (0 without the talent, or from Dark on). */
export function lightSensitivityPenalty(light: LightType | null | undefined, tier: number): number {
  if (!light || tier <= 0) return 0;
  const index = LIGHT_TYPES.indexOf(light);
  if (index < 0 || index >= LIGHT_SENSITIVITY_LEVELS) return 0;
  return Math.min(0, LIGHT_SENSITIVITY_PER_TIER * tier + LIGHT_SENSITIVITY_REDUCTION_PER_LEVEL * index);
}
