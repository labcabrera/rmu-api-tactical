import { ActionAttackParry, ParryType } from '../../../domain/entities/action-attack.vo';

export class ActionAttackParryDto {
  public parryActorId: string;

  public targetId: string;

  public parryType: ParryType;

  public parryAvailable: number;

  public parry: number;

  static fromEntity(entity: ActionAttackParry): ActionAttackParryDto {
    const dto = new ActionAttackParryDto();
    dto.parryActorId = entity.parryActorId;
    dto.targetId = entity.targetId;
    dto.parryType = entity.parryType;
    dto.parryAvailable = entity.parryAvailable;
    dto.parry = entity.parry;
    return dto;
  }
}
