import { ActionParry } from '../../../domain/value-objects/action-attack-parry.vo';
import { ParryType } from '../../../domain/value-objects/parry-type';

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
    dto.parryAvailable = entity.parryAvailable;
    dto.parry = entity.parry;
    return dto;
  }
}
