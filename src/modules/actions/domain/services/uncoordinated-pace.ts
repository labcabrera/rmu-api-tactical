import type { Pace } from '../value-objects/pace.vo.js';

/** Paces from slowest to fastest. */
export const PACE_ORDER: Pace[] = ['creep', 'walk', 'jog', 'run', 'sprint', 'dash'];

/** Table 5-3: penalty of the pace to the other actions of the round, up to run. */
const PACE_PENALTIES: Record<string, number> = { creep: 0, walk: -25, jog: -50, run: -75 };

const RUN_INDEX = PACE_ORDER.indexOf('run');

/**
 * Workspace spec 079, D1: an Uncoordinated actor whose pace counts beyond run takes -25 more per pace beyond it (the
 * usual step of the table); it may still act. Only the declared pace (sprint or dash) forbids other actions.
 */
export const UNCOORDINATED_BEYOND_RUN_STEP = -25;

/** Pace the penalty is read for: an Uncoordinated actor counts one pace faster per tier (capped at dash). */
export const effectivePace = (pace: string, uncoordinatedTier: number): string => {
  const index = PACE_ORDER.indexOf(pace as Pace);
  if (index < 0 || uncoordinatedTier <= 0) {
    return pace;
  }
  return PACE_ORDER[Math.min(index + uncoordinatedTier, PACE_ORDER.length - 1)];
};

/**
 * Penalty of the pace to the actions of the round with the tiers of Uncoordinated (Core Law ch. 4, Table 5-3): the
 * one of the pace it counts as, and -25 per pace beyond run (workspace spec 079, D1). 0 for an unknown pace.
 */
export const pacePenaltyFor = (pace: string, uncoordinatedTier = 0): number => {
  const index = PACE_ORDER.indexOf(pace as Pace);
  if (index < 0) {
    return 0;
  }
  const effective = index + Math.max(0, uncoordinatedTier);
  if (effective <= RUN_INDEX) {
    return PACE_PENALTIES[PACE_ORDER[effective]] ?? 0;
  }
  return PACE_PENALTIES.run + UNCOORDINATED_BEYOND_RUN_STEP * (effective - RUN_INDEX);
};
