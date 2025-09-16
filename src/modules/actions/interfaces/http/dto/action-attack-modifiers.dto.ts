import { ActionAttackModifiers, AttackType } from '../../../domain/value-objects/action-attack-modifiers.vo';

export class ActionAttackModifiersDto {
  public attackName: string;
  public type: AttackType;
  public targetId: string;
  public bo: number;
  public parry: number;
  public cover: string | undefined;
  public restrictedQuarters: string | undefined;
  public positionalSource: string | undefined;
  public positionalTarget: string | undefined;
  public dodge: string | undefined;
  public range: number | undefined;
  public customBonus: number | undefined;
  public disabledDB: boolean | undefined;
  public disabledShield: boolean | undefined;
  public disabledParry: boolean | undefined;

  static fromEntity(entity: ActionAttackModifiers): ActionAttackModifiersDto {
    const dto = new ActionAttackModifiersDto();
    dto.attackName = entity.attackName;
    dto.type = entity.type;
    dto.targetId = entity.targetId;
    dto.bo = entity.bo;
    dto.parry = entity.parry;
    dto.cover = entity.cover;
    dto.restrictedQuarters = entity.restrictedQuarters;
    dto.positionalSource = entity.positionalSource;
    dto.positionalTarget = entity.positionalTarget;
    dto.dodge = entity.dodge;
    dto.range = entity.range;
    dto.customBonus = entity.customBonus;
    dto.disabledDB = entity.disabledDB;
    dto.disabledShield = entity.disabledShield;
    dto.disabledParry = entity.disabledParry;
    return dto;
  }
}
