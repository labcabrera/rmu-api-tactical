import type { ActionType } from './action-type.vo.js';
import type { ManeuverActionPoints } from './maneuver-profile.vo.js';

/**
 * Fixed-cost actions of Table 8-1 declared as subtypes of `other` (workspace spec 079, decision A5). Loading a crossbow
 * takes the light cost unless the weapon is a heavy crossbow.
 */
export type OtherActionKind =
  'shift-item' | 'pick-up' | 'drop-prone' | 'mount-dismount' | 'string-bow' | 'load-crossbow' | 'pick-lock' | 'disarm-trap';

export const OTHER_ACTION_KINDS: OtherActionKind[] = [
  'shift-item',
  'pick-up',
  'drop-prone',
  'mount-dismount',
  'string-bow',
  'load-crossbow',
  'pick-lock',
  'disarm-trap',
];

/** Table 8-1: AP of each fixed-cost action (a light or hand crossbow for `load-crossbow`). */
export const OTHER_ACTION_AP: Record<OtherActionKind, number> = {
  'shift-item': 1,
  'pick-up': 3,
  'drop-prone': 2,
  'mount-dismount': 4,
  'string-bow': 6,
  'load-crossbow': 6,
  'pick-lock': 20,
  'disarm-trap': 20,
};

/** Table 8-1: AP to load a heavy crossbow. */
export const HEAVY_CROSSBOW_LOAD_AP = 14;

/** AP of the action phases of a round: a fixed cost above it goes on in the next rounds. */
const ROUND_ACTION_POINTS = 4;

/** §8.1: penalty per action point below the maximum of the action's range. */
export const AP_PENALTY_PER_MISSING = -25;

export interface ActionApProfileOptions {
  /** AP range of the maneuver's skill profile, from core. Without it a maneuver takes 1 AP. */
  maneuver?: ManeuverActionPoints | null;
  /** The actor has Acrobatics ranks: standing up takes 1 AP (Table 8-1, §9.8 Prone). */
  acrobatics?: boolean;
  /** Workspace spec 079, decision A5: the fixed AP of an `other` action of Table 8-1. */
  other?: { ap: number } | null;
  /**
   * Workspace spec 076, decision B4: drawing or loading with Quickdraw for the weapon (0 AP), or with Slow on the Draw
   * while surprised (2 AP). Quickdraw wins.
   */
  draw?: { quickdraw?: boolean; slowOnTheDraw?: boolean };
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
      case 'cast_spell':
        // Spell Law 4.2: a spell takes 4 AP, hastened down to 2 at -25 per AP (fast casting)
        return new ActionApProfile(2, 4, AP_PENALTY_PER_MISSING);
      case 'stand_up':
        return options.acrobatics ? new ActionApProfile(1, 1, 0) : new ActionApProfile(2, 2, 0);
      case 'dodge':
        return new ActionApProfile(4, 4, 0);
      case 'aim':
        // Workspace spec 076, decision B6: aiming takes the full round
        return new ActionApProfile(4, 4, 0);
      case 'medical':
        // Workspace spec 068, decision 2: 4 AP in each round it lasts, carried to the next round (spec 011, §5)
        return new ActionApProfile(4, 4, 0, true);
      case 'use_item':
        // Decision 7: a healing item takes 2 AP (core's `combatItemAp`, stored in the action's `apRange`)
        return new ActionApProfile(2, 2, 0);
      case 'draw_and_load':
        if (options.draw?.quickdraw) return new ActionApProfile(0, 0, 0);
        if (options.draw?.slowOnTheDraw) return new ActionApProfile(2, 2, 0);
        return new ActionApProfile(1, 1, 0);
      case 'other':
        return options.other ? ActionApProfile.fixed(options.other.ap) : new ActionApProfile(1, 1, 0);
      case 'movement':
      default:
        return new ActionApProfile(1, 1, 0);
    }
  }

  /**
   * A fixed cost of Table 8-1 (workspace spec 079, decision A5): it is resolved with all its AP, with no faster option.
   * Above the 4 AP of a round it is multi-round: it goes on in the next rounds (spec 011, §5) until it has them.
   */
  static fixed(ap: number): ActionApProfile {
    return new ActionApProfile(ap, ap, 0, ap > ROUND_ACTION_POINTS || undefined);
  }

  /** AP of a fixed-cost `other` action; `heavyCrossbow` for loading a heavy crossbow. */
  static otherAp(kind: OtherActionKind, heavyCrossbow = false): number {
    return kind === 'load-crossbow' && heavyCrossbow ? HEAVY_CROSSBOW_LOAD_AP : OTHER_ACTION_AP[kind];
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
