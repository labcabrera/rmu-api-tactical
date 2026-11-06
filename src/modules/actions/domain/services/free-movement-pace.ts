import type { Action } from '../aggregates/action.js';
import type { Pace } from '../value-objects/pace.vo.js';
import { PACE_ORDER } from './uncoordinated-pace.js';

/** Last action phase of a round. */
const LAST_PHASE = 4;

/** Fastest pace of a free movement (Core Law §8.2; workspace spec 080, decision 2). */
export const FREE_MOVEMENT_MAX_PACE: Pace = 'run';

/** Breakdown source of a pace that comes from a free movement (workspace spec 080, decision 3). */
export const FREE_MOVEMENT_SOURCE = 'free-movement';

/** The pace of the free movement that penalizes an action, and the movement it comes from. */
export interface FreeMovementPace {
  pace: Pace;
  movementId: string;
}

/** A pace a free movement may take: up to run. */
export const isFreeMovementPace = (pace: string): boolean => {
  const index = PACE_ORDER.indexOf(pace as Pace);
  return index >= 0 && index <= PACE_ORDER.indexOf(FREE_MOVEMENT_MAX_PACE);
};

/**
 * Phases an action spans: from its first one to its last one, or to the current phase while it is still open (workspace
 * spec 080, decision 3). Never before its first phase nor past the last phase of the round.
 */
export const actionPhaseRange = (action: Action, currentPhase: number | null | undefined): [number, number] => {
  const start = action.phaseStart;
  const end = action.phaseEnd ?? currentPhase ?? start;
  return [start, Math.max(start, Math.min(end, LAST_PHASE))];
};

/**
 * Core Law §8.2 (workspace spec 080, decision 3): the pace that penalizes an action of the actor is the fastest of its
 * resolved free movements of the round whose phases overlap the phases of the action (`phaseStart` to `phaseEnd`, or
 * its first phase). A movement paid with AP is not made at the same time and does not count. A free movement cannot
 * go faster than run; an older one that did is read as run. Null when no free movement overlaps.
 */
export const freeMovementPace = (
  actions: Action[],
  actorId: string,
  round: number,
  phaseStart: number,
  phaseEnd: number,
): FreeMovementPace | null => {
  const runIndex = PACE_ORDER.indexOf(FREE_MOVEMENT_MAX_PACE);
  let fastest: FreeMovementPace | null = null;
  for (const action of actions) {
    if (action.actorId !== actorId || action.round !== round || !action.isFreeMovement() || action.status !== 'completed') {
      continue;
    }
    const index = PACE_ORDER.indexOf(action.movement?.modifiers?.pace as Pace);
    if (index < 0) {
      continue;
    }
    const start = action.phaseStart;
    const end = action.phaseEnd ?? start;
    if (start > phaseEnd || end < phaseStart) {
      continue;
    }
    const pace = PACE_ORDER[Math.min(index, runIndex)];
    if (!fastest || PACE_ORDER.indexOf(pace) > PACE_ORDER.indexOf(fastest.pace)) {
      fastest = { pace, movementId: action.id };
    }
  }
  return fastest;
};

/** The free movement pace that overlaps `action`, an action of the actor being resolved in `currentPhase`. */
export const freeMovementPaceFor = (
  actions: Action[],
  action: Action,
  currentPhase: number | null | undefined,
): FreeMovementPace | null => {
  const [start, end] = actionPhaseRange(action, currentPhase);
  return freeMovementPace(actions, action.actorId, action.round, start, end);
};

/** The pace an action is made at and where it comes from (workspace spec 080, decision 3). */
export interface EffectivePace {
  pace: string;
  /** `manual`: chosen by the game master; `free-movement`: the free movement of the actor at the same time. */
  source: 'manual' | typeof FREE_MOVEMENT_SOURCE;
  /** The free movement, when the pace comes from one. */
  movementId?: string;
}

/**
 * The faster of the pace the game master chose and the one of the free movement (workspace spec 080, decision 3): the
 * free movement's on a tie. Undefined when there is neither.
 */
export const effectiveActionPace = (manual: string | null | undefined, movement: FreeMovementPace | null): EffectivePace | undefined => {
  if (movement && (!manual || PACE_ORDER.indexOf(movement.pace) >= PACE_ORDER.indexOf(manual as Pace))) {
    return { pace: movement.pace, source: FREE_MOVEMENT_SOURCE, movementId: movement.movementId };
  }
  return manual ? { pace: manual, source: 'manual' } : undefined;
};
