import { ActionParry } from '../../../domain/value-objects/action-attack-parry.vo.js';
import type { ProtectPosition } from '../../../domain/value-objects/action-attack-modifiers.vo.js';
import type { ParryType } from '../../../domain/value-objects/parry-type.vo.js';
import type { ParryBreakdown, ParryExclusion } from '../../../domain/value-objects/action-attack-parry.vo.js';
import type { ModifierParams } from '../../../domain/value-objects/key-value-modifier.vo.js';

/** Where the most an actor can parry comes from (spec 051). */
export class ParryBreakdownDto {
  /** Melee attack it parries with. */
  attackName: string;
  /** OB left on that attack this round. */
  bo: number;
  /** Penalties of the actor (0 or negative). */
  penalty: number;
  /** Protect penalty left after the Protect skill, for a protector. */
  protectPenalty?: number;

  static fromEntity(entity: ParryBreakdown): ParryBreakdownDto {
    const dto = new ParryBreakdownDto();
    dto.attackName = entity.attackName;
    dto.bo = entity.bo;
    dto.penalty = entity.penalty;
    dto.protectPenalty = entity.protectPenalty;
    return dto;
  }
}

/** An actor who cannot parry or protect against the attack, and why (spec 051). */
export class ParryExclusionDto {
  actorId: string;
  targetActorId: string;
  parryType: ParryType;
  /** `parry-forbidden`, `parry-last-action` or `parry-no-ob`. */
  reason: string;
  params?: ModifierParams;

  static fromEntity(entity: ParryExclusion): ParryExclusionDto {
    const dto = new ParryExclusionDto();
    dto.actorId = entity.actorId;
    dto.targetActorId = entity.targetActorId;
    dto.parryType = entity.parryType;
    dto.reason = entity.reason;
    dto.params = entity.params;
    return dto;
  }
}

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
  /** A carried-over parry that used all the OB available in its first action (spec 040). */
  fullParry: boolean | undefined;
  /** Where the available parry comes from (spec 051). */
  breakdown: ParryBreakdownDto | undefined;

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
    dto.fullParry = entity.fullParry;
    dto.breakdown = entity.breakdown ? ParryBreakdownDto.fromEntity(entity.breakdown) : undefined;
    return dto;
  }
}
