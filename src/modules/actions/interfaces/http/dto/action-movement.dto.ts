import { ActionMovement, ActionMovementModifiers, ActionMovementResult } from '../../../domain/value-objects/action-movement.vo';
import { ActionRollDto } from './action-roll.dto';

export class ActionMovementDto {
  modifiers: ActionMovementModifiersDto;
  roll?: ActionRollDto;
  calculated?: ActionMovementResultDto;

  static fromEntity(movement: ActionMovement): ActionMovementDto {
    const dto = new ActionMovementDto();
    dto.modifiers = ActionMovementModifiersDto.fromEntity(movement.modifiers);
    dto.roll = movement.roll ? ActionRollDto.fromEntity(movement.roll) : undefined;
    dto.calculated = movement.calculated ? ActionMovementResultDto.fromEntity(movement.calculated) : undefined;
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
