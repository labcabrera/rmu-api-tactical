import { ActionAttack } from '../../../domain/entities/action.entity';

export class ActionAttackDto {
  attackType: string;
  targetId: string;
  parry: number;
  status: string;

  static fromEntity(entity: ActionAttack): ActionAttackDto {
    const dto = new ActionAttackDto();
    dto.attackType = entity.attackType;
    dto.targetId = entity.targetId;
    dto.parry = entity.parry;
    dto.status = entity.status;
    return dto;
  }
}
