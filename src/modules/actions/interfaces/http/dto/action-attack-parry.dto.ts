import { ActionParry, ParryType } from '../../../domain/value-objects/action-attack.vo';

export class ActionParryDto {
  id: string;
  actorId: string;
  targetActorId: string;
  parryType: ParryType;
  targetAttackName: string | undefined;
  parryAvailable: number;
  parry: number;

  static fromEntity(entity: ActionParry): ActionParryDto {
    const dto = new ActionParryDto();
    dto.id = entity.id;
    dto.actorId = entity.actorId;
    dto.targetActorId = entity.targetActorId;
    dto.parryType = entity.parryType;
    dto.targetAttackName = entity.targetAttackName;
    dto.parryAvailable = entity.parryAvailable;
    dto.parry = entity.parry;
    return dto;
  }
}
