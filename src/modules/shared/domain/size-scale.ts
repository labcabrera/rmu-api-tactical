/**
 * The size scale (Table 9-4a, Creature Law T-3.1c; workspace spec 075, decision 1): thirteen classes, medium = 5.
 * Tactical stores sizes as steps from medium (class − 5). The Hit Multiplier scales the damage of an attack by its size.
 */
export interface SizeScaleEntry {
  id: SizeId;
  /** Size class, 1-13 (I-XIII). */
  sizeClass: number;
  /** Steps from medium: class − 5. */
  steps: number;
  hitMultiplier: number;
}

export const SIZE_IDS = [
  'minuscule',
  'diminutive',
  'tiny',
  'small',
  'medium',
  'big',
  'large',
  'huge',
  'gigantic',
  'enormous',
  'immense',
  'behemoth',
  'leviathan',
] as const;

export type SizeId = (typeof SIZE_IDS)[number];

/** Size class of a medium creature. */
export const MEDIUM_SIZE_CLASS = 5;

const HIT_MULTIPLIERS = [0.25, 0.5, 0.67, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 7, 8];

export const SIZE_SCALE: readonly SizeScaleEntry[] = SIZE_IDS.map((id, index) => ({
  id,
  sizeClass: index + 1,
  steps: index + 1 - MEDIUM_SIZE_CLASS,
  hitMultiplier: HIT_MULTIPLIERS[index],
}));

const MIN_STEPS = SIZE_SCALE[0].steps;
const MAX_STEPS = SIZE_SCALE[SIZE_SCALE.length - 1].steps;

/** The entry of a number of steps, clamped to the ends of the scale. */
export const sizeEntryOf = (steps: number): SizeScaleEntry =>
  SIZE_SCALE[Math.max(MIN_STEPS, Math.min(MAX_STEPS, Math.round(steps || 0))) - MIN_STEPS];

/** Steps from medium of a size id; undefined for an unknown one. */
export const stepsOf = (sizeId: string | null | undefined): number | undefined => SIZE_SCALE.find(entry => entry.id === sizeId)?.steps;

/** Size class (1-13) of a size id; undefined for an unknown one. */
export const sizeClassOf = (sizeId: string | null | undefined): number | undefined =>
  SIZE_SCALE.find(entry => entry.id === sizeId)?.sizeClass;

/** Hit Multiplier of an attack of `steps` from medium, clamped to the ends of the scale. */
export const hitMultiplierOf = (steps: number): number => sizeEntryOf(steps).hitMultiplier;
