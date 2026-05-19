import {
  CalledShot,
  ChargeSpeed,
  Cover,
  Dodge,
  PositionalSource,
  PositionalTarget,
  RestrictedQuarters,
} from '../../../domain/value-objects/action-attack-modifiers.vo';

export class PrepareAttackCommand {
  constructor(
    public readonly actionId: string,
    public readonly attacks: PrepareAttackCommandItem[],
    public readonly userId,
    public readonly userRoles,
  ) {}
}

export class PrepareAttackCommandItem {
  constructor(
    public attackName: string,
    public modifiers: PrepareAttackCommandModifiers,
    public protectors: string[] | null,
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
    public dodge: Dodge | undefined,
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
  ) {}
}

export class PrepareAttackCommandParryItem {
  constructor(
    public parryActorId: string,
    public targetId: string,
  ) {}
}
