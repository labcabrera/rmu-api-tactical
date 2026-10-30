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

export class ActionParry {
  constructor(
    public readonly id: string,
    /** Actor identifier. Can be the target of the attack or a protector */
    public readonly actorId: string,
    /** Actor who is the target of the attack (in two handed melee combat one attacker can attack two targets) */
    public readonly targetActorId: string,
    public readonly parryType: ParryType,
    /** Most OB the actor can give to this parry (for a protector, once the protect penalty is taken off). */
    public readonly parryAvailable: number,
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
    public readonly breakdown?: ParryBreakdown,
  ) {}
}
