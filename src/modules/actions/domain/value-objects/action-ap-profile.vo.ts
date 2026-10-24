import type { ActionType } from './action-type.vo.js';
import type { ManeuverActionPoints } from './maneuver-profile.vo.js';

/** §8.1: penalty per action point below the maximum of the action's range. */
export const AP_PENALTY_PER_MISSING = -25;

export interface ActionApProfileOptions {
  /** AP range of the maneuver's skill profile, from core. Without it a maneuver takes 1 AP. */
  maneuver?: ManeuverActionPoints | null;
  /** The actor has Acrobatics ranks: standing up takes 1 AP (Table 8-1, §9.8 Prone). */
  acrobatics?: boolean;
}

/**
 * AP range of an action type (spec 011, §3; §8.1 and Table 8-1): it can be resolved from `min` AP, and each AP below
 * `max` gives `penaltyPerMissing`. A `multiRound` action keeps going in the next round whatever the game options.
 */
export class ActionApProfile {
  constructor(
    public readonly min: number,
    public readonly max: number,
    /** Penalty per AP below `max` (0 when the action has none). */
    public readonly penaltyPerMissing: number,
    public readonly multiRound?: boolean,
  ) {}

  static forAction(actionType: ActionType, options: ActionApProfileOptions = {}): ActionApProfile {
    switch (actionType) {
      case 'melee_attack':
        return new ActionApProfile(2, 4, AP_PENALTY_PER_MISSING);
      case 'ranged_attack':
        return new ActionApProfile(1, 3, AP_PENALTY_PER_MISSING);
      case 'maneuver':
        return ActionApProfile.forManeuver(options.maneuver);
      case 'stand_up':
        return options.acrobatics ? new ActionApProfile(1, 1, 0) : new ActionApProfile(2, 2, 0);
      case 'dodge':
        return new ActionApProfile(4, 4, 0);
      case 'movement':
      case 'draw_and_load':
      case 'other':
      default:
        return new ActionApProfile(1, 1, 0);
    }
  }

  /** A maneuver takes the AP range of its skill's profile (1-1 when it has none), at -25 per AP below the maximum. */
  static forManeuver(range: ManeuverActionPoints | null | undefined): ActionApProfile {
    if (!range) {
      return new ActionApProfile(1, 1, AP_PENALTY_PER_MISSING);
    }
    return new ActionApProfile(range.min, range.max, AP_PENALTY_PER_MISSING);
  }

  /** AP below the maximum, 0 when it has the maximum or more (spending more gives no bonus). */
  missing(actionPoints: number): number {
    return Math.max(0, this.max - actionPoints);
  }

  /** Penalty of resolving the action with `actionPoints` AP (0 or negative). */
  penaltyFor(actionPoints: number): number {
    const missing = this.missing(actionPoints);
    return missing === 0 ? 0 : missing * this.penaltyPerMissing;
  }

  /** The action can be resolved with `actionPoints` AP. */
  reachesMin(actionPoints: number): boolean {
    return actionPoints >= this.min;
  }
}
