import type { ProtectPosition } from './action-attack-modifiers.vo.js';
import type { ModifierParams } from './key-value-modifier.vo.js';
import type { ParryType } from './parry-type.vo.js';

/**
 * Where the most an actor can parry comes from (spec 051): the OB left on the melee attack it parries with (its
 * earlier uses and parries of the round taken off) and its penalties; for a protector, also the protect penalty.
 */
export interface ParryBreakdown {
  attackName: string;
  bo: number;
  penalty: number;
  protectPenalty?: number;
}

/** An actor who cannot parry or protect against the attack, and why (spec 051). */
export interface ParryExclusion {
  actorId: string;
  targetActorId: string;
  parryType: ParryType;
  /** `parry-forbidden`, `parry-last-action` or `parry-no-ob`: the key of its explanation. */
  reason: string;
  params?: ModifierParams;
}

/**
 * The attacker strikes the defender from its flank or rear (workspace spec 079, decision A2; §9.6 Parrying): the DB the
 * parry gives loses `penalty` (-30 flank, -70 rear), offset 1:1 by the defender's Reverse Strike.
 */
export interface ParryPositional {
  position: 'flank' | 'rear';
  penalty: number;
  /** Reverse Strike bonus of the defender when the attack was prepared (0 without it). */
  reverseStrike: number;
}

/**
 * The absolute Combat Training maneuver of a parry against a further foe (workspace spec 079, decision A2; §9.6 Parrying
 * more than one foe): from the second foe the defender parries in the round. The result is entered; only a success or
 * better lets the parry count.
 */
export interface ParryManeuver {
  required: true;
  /** Foes the defender already parried in the round. */
  foes: number;
  /** Result of the absolute maneuver (`absolute-failure`...`absolute-success`); null while pending. */
  result: string | null;
  passed: boolean | null;
}

/** Results of the parry maneuver that let the parry count. */
export const PARRY_MANEUVER_PASSED_RESULTS = ['success', 'absolute-success'];

/** Results an absolute maneuver can give. */
export const ABSOLUTE_MANEUVER_RESULTS = ['absolute-failure', 'failure', 'partial-success', 'success', 'absolute-success'];

export class ActionParry {
  /** The attacker is on the defender's flank or rear (workspace spec 079, decision A2). */
  public positional?: ParryPositional | null;

  /** The Combat Training maneuver this parry needs (workspace spec 079, decision A2). */
  public parryManeuver?: ParryManeuver | null;

  constructor(
    public readonly id: string,
    /** Actor identifier. Can be the target of the attack or a protector */
    public readonly actorId: string,
    /** Actor who is the target of the attack (in two handed melee combat one attacker can attack two targets) */
    public readonly targetActorId: string,
    public readonly parryType: ParryType,
    /** Most OB the actor can give to this parry (for a protector, once the protect penalty is taken off). */
    public parryAvailable: number,
    public parry: number,
    /**
     * Protect penalty (Table 9-7c) left after the Protect skill, 0 or negative: it is taken from the protector's OB
     * when it protects with any amount (§9.7 Protecting Others).
     */
    public readonly penalty?: number,
    /** Where the protector stands. */
    public readonly protectPosition?: ProtectPosition,
    /**
     * The parry was declared against this attacker in an earlier action of the round: it counts against every attack
     * of that foe and its OB is only spent once (§9.6 Parrying), so it is fixed and not spent again.
     */
    public readonly carriedOver?: boolean,
    /**
     * Workspace spec 040 (Survival Instinct): a carried-over parry came from one that used all the OB available then,
     * since its own `parry` and `parryAvailable` are both the OB carried.
     */
    public readonly fullParry?: boolean,
    /** Where `parryAvailable` comes from (spec 051). */
    public breakdown?: ParryBreakdown,
  ) {}
}
