import type { AttackMode } from '../../../domain/services/special-maneuvers.js';
import type {
  CalledShot,
  ChargeSpeed,
  Cover,
  PositionalSource,
  PositionalTarget,
  ProtectPosition,
  RestrictedQuarters,
} from '../../../domain/value-objects/action-attack-modifiers.vo.js';

export class PrepareAttackCommand {
  constructor(
    public readonly actionId: string,
    public readonly attacks: PrepareAttackCommandItem[],
    public readonly userId: string,
    public readonly userRoles: string[],
    /**
     * Workspace spec 077, P9: the OB of a bolt with Scope Skills given to each target, in the order of `attacks`; the
     * bolt's OB in equal parts when left out.
     */
    public readonly obSplit?: number[],
  ) {}
}

export class PrepareAttackCommandItem {
  constructor(
    public attackName: string,
    public modifiers: PrepareAttackCommandModifiers,
    public protectors: string[] | null,
    public protectorPositions?: Record<string, ProtectPosition>,
  ) {}
}

export class PrepareAttackCommandModifiers {
  constructor(
    public targetId: string,
    public bo: number,
    public calledShot: CalledShot | undefined,
    public calledShotPenalty: number | undefined,
    public positionalSource: PositionalSource | undefined,
    public positionalTarget: PositionalTarget | undefined,
    public restrictedQuarters: RestrictedQuarters | undefined,
    public cover: Cover | undefined,
    public disabledDB: boolean | undefined,
    public disabledShield: boolean | undefined,
    public disabledParry: boolean | undefined,
    public pace: string | undefined,
    public restrictedParry: boolean | undefined,
    public higherGround: boolean | undefined,
    public stunnedFoe: boolean | undefined,
    public surprisedFoe: boolean | undefined,
    public proneTarget: boolean | undefined,
    public proneSource: boolean | undefined,
    public attackerInMelee: boolean | undefined,
    public offHand: boolean | undefined,
    public ambush: boolean | undefined,
    public range: number | undefined,
    public customBonus: number | undefined,
    public chargeSpeed: ChargeSpeed | undefined,
    public styleCriticalOption?: string,
    /** Workspace spec 079, A6-A7: attack mode, disarm and subdual inputs, combatants giving cover in a melee. */
    public special?: PrepareAttackCommandSpecial,
  ) {}
}

export interface PrepareAttackCommandSpecial {
  attackMode?: AttackMode;
  disarmDefenseRoll?: number | null;
  disarmTwoHanded?: boolean;
  subdualBonus?: number | null;
  unfamiliarAnatomy?: boolean;
  meleeCoverActorIds?: string[];
  /** Workspace spec 079, D3: the attack is made with the flexible limb of Extra Joints. */
  extraJoints?: boolean;
}

export class PrepareAttackCommandParryItem {
  constructor(
    public parryActorId: string,
    public targetId: string,
  ) {}
}
