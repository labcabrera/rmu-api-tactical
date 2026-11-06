import type { Action } from '../aggregates/action.js';
import type { Pace } from '../value-objects/pace.vo.js';
import { PACE_ORDER } from './uncoordinated-pace.js';

/** Table 5-3: BMR covered in a round at each pace. */
export const BMR_PER_ROUND: Record<Pace, number> = { creep: 0.5, walk: 1, jog: 2, run: 3, sprint: 4, dash: 5 };

/** Core Law §8.2: BMR that an AP of a dash covers. */
export const DASH_BMR_PER_AP = 1.25;

/** Fastest pace moving backwards or prone (§5.3): at half speed too. */
export const SLOW_MOVEMENT_MAX_PACE: Pace = 'jog';

/** Pace of a round from the AP spent on normal movements in it (Table 5-3; workspace spec 081, decision 5). */
const PACE_OF_AP: Pace[] = ['creep', 'walk', 'jog', 'run', 'sprint'];

/** Activity points of a round at each pace: 100 per check, with the intervals of Table 5-5 (12 rounds a minute). */
const ROUND_FATIGUE: Record<Pace, number> = { creep: 0, walk: 0, jog: 100 / 60, run: 100 / 12, sprint: 50, dash: 100 };

export const paceOfMovementAp = (actionPoints: number): Pace => PACE_OF_AP[Math.min(Math.max(0, actionPoints), PACE_OF_AP.length - 1)];

/** AP spent on the resolved normal movements of `actions`. */
export const normalMovementAp = (actions: Action[]): number =>
  actions
    .filter(action => action.actionType === 'movement' && !action.freeAction && action.status === 'completed')
    .reduce((sum, action) => sum + (action.actionPoints ?? 0), 0);

/**
 * Workspace spec 081, decision 6: the fatigue a normal movement adds, what the pace of the round reaches with it minus
 * what it had reached before.
 */
export const normalMovementFatigue = (previousAp: number, actionPoints: number): number =>
  ROUND_FATIGUE[paceOfMovementAp(previousAp + actionPoints)] - ROUND_FATIGUE[paceOfMovementAp(previousAp)];

/** The slower of the paces that cap a movement, ignoring the ones not known. */
export const slowestPace = (...paces: Array<string | null | undefined>): Pace | undefined => {
  const indexes = paces.map(pace => PACE_ORDER.indexOf(pace as Pace)).filter(index => index >= 0);
  return indexes.length > 0 ? PACE_ORDER[Math.min(...indexes)] : undefined;
};

/** Distance of a resolved movement in an action phase: evenly over the phases it spans. */
export const distanceInPhase = (action: Action, phase: number): number => {
  const start = action.phaseStart;
  const end = action.phaseEnd ?? start;
  if (action.actionType !== 'movement' || action.status !== 'completed' || phase < start || phase > end) {
    return 0;
  }
  return (action.movement?.calculated?.distance ?? 0) / (end - start + 1);
};

/** Distance of the resolved movements of `actions`. */
export const movedDistance = (actions: Action[]): number =>
  actions
    .filter(action => action.actionType === 'movement' && action.status === 'completed')
    .reduce((sum, action) => sum + (action.movement?.calculated?.distance ?? 0), 0);

/**
 * Workspace spec 081, decision 2: a phase where a normal and a free movement together go past the speed of a dash.
 * `action` is the movement just resolved.
 */
export const overDashInPhase = (action: Action, others: Action[], bmr: number): boolean => {
  const end = action.phaseEnd ?? action.phaseStart;
  for (let phase = action.phaseStart; phase <= end; phase++) {
    const moving = [action, ...others].filter(each => distanceInPhase(each, phase) > 0);
    const mixed = moving.some(each => each.freeAction) && moving.some(each => !each.freeAction);
    const total = moving.reduce((sum, each) => sum + distanceInPhase(each, phase), 0);
    if (mixed && total > bmr * DASH_BMR_PER_AP) {
      return true;
    }
  }
  return false;
};
