import type { InjurySource } from './injury.vo.js';

/** Bonus of the attacker against the foe it inflicted a critical on (Pressing the Advantage). */
export const PRESSING_ADVANTAGE = 'pressing-advantage';

/** Penalty to all actions in the round after inflicting a critical (Non-violent). */
export const NON_VIOLENT = 'non-violent';

/** Effects that change the action points of the round (spec 011, §1). */
export const SURPRISED = 'surprised';
export const FLATFOOTED = 'flatfooted';
/** Loses 1 AP (or its value) in the phase it is applied in; removed in the upkeep once applied (§8.3). */
export const STAGGERED = 'staggered';
/** Haste and speed: `value` extra AP (1-4). */
export const HASTE = 'haste';
export const SPEED = 'speed';
/** Reflexes: `value` extra AP (1-3) and +10/+15/+20 to the initiative. */
export const REFLEXES = 'reflexes';
/** Adrenal speed: `value` extra AP (2 or 4), only in the round it is applied in. */
export const ADRENAL_SPEED = 'adrenal-speed';
/** Hold Kind: loses `value` AP (3 when missing) from the first phase. */
export const HOLD = 'hold';
/** Mind distraction: loses `value` AP (1-3) from the first phase. */
export const DISTRACTION = 'distraction';
/** At most `value` AP in the round (Collapse Lung: 2). */
export const AP_CAP = 'ap-cap';
/** AP added (positive `value`) or taken (negative `value`) by the game master. */
export const MANUAL_AP = 'manual';

/** Out of the fight until its hits are over 0 again, or the game master ends it (§9.8 Hits). */
export const UNCONSCIOUS = 'unconscious';
export const DEAD = 'dead';
/** Dies when its rounds run out unless stabilized (spec 013, §3). */
export const DYING = 'dying';
/** Critical states that keep the actor from acting (enriched critical data). */
export const INCAPACITATED = 'incapacitated';
export const PARALYZED = 'paralyzed';
/** Statuses of the critical data that become injuries instead of effects (spec 013, §3). */
export const PENALTY = 'penalty';
export const BLEEDING = 'bleeding';

export const AP_EFFECT_STATUSES = [
  SURPRISED,
  FLATFOOTED,
  STAGGERED,
  HASTE,
  SPEED,
  REFLEXES,
  ADRENAL_SPEED,
  HOLD,
  DISTRACTION,
  AP_CAP,
  MANUAL_AP,
];

export class ActorRoundEffect {
  constructor(
    public readonly id: string,
    public readonly status: string,
    public value: number | undefined,
    public rounds: number | undefined,
    /** Round the effect was applied in. Effects stored without it lose a round in every upkeep. */
    public appliedRound?: number,
    /** Phase the effect was applied in: 0 before the action phases, 1-4 in an action phase, 5 in the upkeep. */
    public appliedPhase?: number,
    /** Action points the actor had spent in the round before the effect (§8.3 Upkeep). */
    public spentApBefore?: number,
    /** Actor the effect refers to, such as the foe of a `pressing-advantage`. */
    public targetActorId?: string,
    /** Where the effect comes from: the critical or fumble, or the strategic condition it was copied from. */
    public source?: InjurySource,
  ) {}

  static isUnique(effect: ActorRoundEffect): boolean {
    switch (effect.status) {
      case DEAD:
      case UNCONSCIOUS:
      case 'surprised':
      case 'flatfooted':
        return true;
    }
    return false;
  }

  static isStackable(effect: ActorRoundEffect): boolean {
    switch (effect.status) {
      case 'penalty':
      case 'fatigue':
        return true;
    }
    return false;
  }

  /** Surprise states (§8.3 Surprise): they last the round they are set in, whatever the action points spent. */
  static isRoundBound(effect: ActorRoundEffect): boolean {
    return effect.status === 'surprised' || effect.status === 'flatfooted';
  }
}
