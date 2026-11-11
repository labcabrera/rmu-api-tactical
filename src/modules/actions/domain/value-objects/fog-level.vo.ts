/**
 * Fog and mist of a tactical game (§15.7, Table 15-7; workspace spec 079, C5): four levels, from light fog or mist to
 * extreme fog.
 */
export type FogLevel = 'light' | 'medium' | 'heavy' | 'extreme';

export const FOG_LEVELS: FogLevel[] = ['light', 'medium', 'heavy', 'extreme'];

export interface FogLevelData {
  /** How far one sees, in feet. */
  visibilityFeet: number;
  /** Modifier to the visual Perception and Tracking maneuvers. */
  perception: number;
}

/** Table 15-7 (fog): the vision talents (Nightvision, Darkvision) do not reduce it. */
export const FOG_TABLE: Record<FogLevel, FogLevelData> = {
  light: { visibilityFeet: 300, perception: -15 },
  medium: { visibilityFeet: 100, perception: -25 },
  heavy: { visibilityFeet: 50, perception: -50 },
  extreme: { visibilityFeet: 10, perception: -75 },
};

/** §15.7 Fog and Mist: hearing a sound beyond the visual range, it cannot be located. */
export const FOG_BEYOND_VISUAL_RANGE_HEARING = -20;

export const FOG_RULE = '§15.7';

export const isFogLevel = (value: unknown): value is FogLevel => typeof value === 'string' && FOG_LEVELS.includes(value as FogLevel);

/** A fog modifier of a Perception or Tracking maneuver. */
export interface FogModifier {
  key: 'fog' | 'fog-beyond-visual-range';
  value: number;
  params: Record<string, string | number>;
}

/**
 * The fog modifiers of a Perception or Tracking maneuver with `sense`: the fog value with vision, and -20 with hearing
 * when the sound is beyond the visual range (`beyondVisualRange`). None without fog or with the other senses.
 */
export function fogModifiers(fog: FogLevel | null | undefined, sense: string, beyondVisualRange: boolean): FogModifier[] {
  if (!fog || !FOG_TABLE[fog]) return [];
  if (sense === 'vision') {
    return [{ key: 'fog', value: FOG_TABLE[fog].perception, params: { fog, visibilityFeet: FOG_TABLE[fog].visibilityFeet } }];
  }
  if (sense === 'hearing' && beyondVisualRange) {
    return [{ key: 'fog-beyond-visual-range', value: FOG_BEYOND_VISUAL_RANGE_HEARING, params: { fog } }];
  }
  return [];
}
