import {
  ActionMovement,
  ActionMovementBonus,
  ActionMovementModifiers,
  ActionMovementResult,
  ActionMovementRoll,
} from '../../../domain/entities/action-movement.entity';

export class ActionMovementDto {
  modifiers: ActionMovementModifiersDto;
  roll: ActionMovementRollDto | undefined;
  calculated: ActionMovementResultDto;

  static fromEntity(movement: ActionMovement): ActionMovementDto {
    const dto = new ActionMovementDto();
    dto.modifiers = ActionMovementModifiersDto.fromEntity(movement.modifiers);
    dto.roll = ActionMovementRollDto.fromEntity(movement.roll);
    dto.calculated = ActionMovementResultDto.fromEntity(movement.calculated);
    return dto;
  }
}

export class ActionMovementModifiersDto {
  pace: string;
  requiredManeuver: boolean;
  skillId: string | undefined;
  difficulty: string | undefined;
  customBonus: number | undefined;

  static fromEntity(modifiers: ActionMovementModifiers): ActionMovementModifiersDto {
    const dto = new ActionMovementModifiersDto();
    dto.pace = modifiers.pace;
    dto.requiredManeuver = modifiers.requiredManeuver;
    dto.skillId = modifiers.skillId;
    dto.difficulty = modifiers.difficulty;
    return dto;
  }
}

export class ActionMovementRollDto {
  rollModifiers: ActionMovementBonusDto[];
  roll: number;
  totalRoll: number;

  static fromEntity(roll: ActionMovementRoll | undefined): ActionMovementRollDto | undefined {
    if (!roll) return undefined;

    const dto = new ActionMovementRollDto();
    dto.rollModifiers = roll.rollModifiers.map((e) => ActionMovementBonusDto.fromEntity(e));
    dto.roll = roll.roll;
    dto.totalRoll = roll.totalRoll;
    return dto;
  }
}

export class ActionMovementResultDto {
  bmr: number;
  paceMultiplier: number;
  percent: number;
  distance: number;
  distanceAdjusted: number;
  critical: string | undefined;
  description: string;

  static fromEntity(calculated: ActionMovementResult): ActionMovementResultDto {
    const dto = new ActionMovementResultDto();
    dto.bmr = calculated.bmr;
    dto.paceMultiplier = calculated.paceMultiplier;
    dto.percent = calculated.percent;
    dto.distance = calculated.distance;
    dto.distanceAdjusted = calculated.distanceAdjusted;
    dto.critical = calculated.critical;
    dto.description = calculated.description;
    return dto;
  }
}

export class ActionMovementBonusDto {
  key: string;
  value: number;

  static fromEntity(fromEntity: ActionMovementBonus): ActionMovementBonusDto {
    const dto = new ActionMovementBonusDto();
    dto.key = fromEntity.key;
    dto.value = fromEntity.value;
    return dto;
  }
}
