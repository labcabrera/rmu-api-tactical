import type { InjurySource } from './injury.vo.js';

/** Bonus of the attacker against the foe it inflicted a critical on (Pressing the Advantage). */
export const PRESSING_ADVANTAGE = 'pressing-advantage';

/** Penalty to the attacks for the rest of the combat after inflicting a critical (Non-violent, workspace spec 039). */
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

/**
 * Fear states (Table 14-3a, workspace spec 022, decision 9), mildest first: they last until a rally or the game master
 * removes them. Routed and broken actors cannot declare attacks (forced actions still can); the rest of each state is a
 * warning for the game master.
 */
export const FEAR_BALK = 'fear-balk';
export const FEAR_RETREAT = 'fear-retreat';
export const FEAR_ROUTED = 'fear-routed';
export const FEAR_BROKEN = 'fear-broken';
export const FEAR_EFFECTS = [FEAR_BALK, FEAR_RETREAT, FEAR_ROUTED, FEAR_BROKEN];
/** Fear states that keep the actor from declaring attacks. */
export const FEAR_NO_ATTACK_EFFECTS = [FEAR_ROUTED, FEAR_BROKEN];

/**
 * Effects the critical and fumble tables only gave in the text (workspace spec 034, phase 4). `half_activity` caps the
 * AP at 2 and `half_movement` halves the movement rate; `cannot_parry` and `cannot_attack` keep the actor from parrying
 * and from declaring attacks; `disarmed` from attacking with an item until the game master removes it; `arm_useless`
 * is both (a `limb_useless` arm; a leg is `half_movement`). `initiative_penalty` (negative `value`) lowers the
 * initiative, `attack_penalty` (negative `value`) the OB, and `blinded` fights in pitch black (-100).
 */
export const HALF_ACTIVITY = 'half_activity';
export const HALF_MOVEMENT = 'half_movement';
export const CANNOT_PARRY = 'cannot_parry';
export const CANNOT_ATTACK = 'cannot_attack';
export const DISARMED = 'disarmed';
export const ARM_USELESS = 'arm_useless';
export const INITIATIVE_PENALTY = 'initiative_penalty';
export const ATTACK_PENALTY = 'attack_penalty';
export const BLINDED = 'blinded';
/** AP cap of half activity. */
export const HALF_ACTIVITY_AP = 2;
/** OB modifier of a blinded attacker: the pitch black row of Table 5-1 where sight is required (ch. 15). */
export const BLINDED_MODIFIER = -100;

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
    /** First round the effect counts in (a delayed effect, spec 034): before it, it neither applies nor loses rounds. */
    public fromRound?: number,
  ) {}

  /** The effect is delayed and has not started by `round`. */
  static isPending(effect: ActorRoundEffect, round: number): boolean {
    return effect.fromRound !== undefined && effect.fromRound !== null && effect.fromRound > round;
  }

  static isUnique(effect: ActorRoundEffect): boolean {
    switch (effect.status) {
      case DEAD:
      case UNCONSCIOUS:
      case DISARMED:
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
