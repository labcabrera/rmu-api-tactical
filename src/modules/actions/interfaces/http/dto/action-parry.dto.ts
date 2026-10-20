import { ActionParry } from '../../../domain/value-objects/action-attack-parry.vo';
import { ProtectPosition } from '../../../domain/value-objects/action-attack-modifiers.vo';
import { ParryType } from '../../../domain/value-objects/parry-type';

export class ActionParryDto {
  id: string;
  actorId: string;
  targetActorId: string;
  parryType: ParryType;
  targetAttackName: string | undefined;
  parryAvailable: number;
  parry: number;
  /** Protect penalty left after the Protect skill (0 or negative), spent from the protector's OB. */
  penalty: number | undefined;
  protectPosition: ProtectPosition | undefined;
  /** Parry declared against this attacker in an earlier action: fixed, and its OB is not spent again. */
  carriedOver: boolean | undefined;

  static fromEntity(entity: ActionParry): ActionParryDto {
    const dto = new ActionParryDto();
    dto.id = entity.id;
    dto.actorId = entity.actorId;
    dto.targetActorId = entity.targetActorId;
    dto.parryType = entity.parryType;
    dto.parryAvailable = entity.parryAvailable;
    dto.parry = entity.parry;
    dto.penalty = entity.penalty;
    dto.protectPosition = entity.protectPosition;
    dto.carriedOver = entity.carriedOver;
    return dto;
  }
}
