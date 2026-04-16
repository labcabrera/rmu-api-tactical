import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { ActionMovement, ActionMovementModifiers, ActionMovementResult } from '../../../domain/value-objects/action-movement.vo';
import { Difficulty } from '../../../domain/value-objects/dificulty.vo';
import type { Pace } from '../../../domain/value-objects/pace.vo';
import { ActionRollDto } from './action-roll.dto';

export class ActionMovementDto {
  modifiers: ActionMovementModifiersDto;
  roll: ActionRollDto | null;
  calculated: ActionMovementResultDto | null;

  static fromEntity(movement: ActionMovement): ActionMovementDto {
    const dto = new ActionMovementDto();
    dto.modifiers = ActionMovementModifiersDto.fromEntity(movement.modifiers);
    dto.roll = movement.roll ? ActionRollDto.fromEntity(movement.roll) : null;
    dto.calculated = movement.calculated ? ActionMovementResultDto.fromEntity(movement.calculated) : null;
    return dto;
  }
}

export class ActionMovementModifiersDto {
  @ApiProperty({ description: 'The pace of the movement', example: 'walk' })
  @IsString()
  pace: Pace;

  @ApiProperty({ description: 'Indicates if a maneuver is required', example: true })
  @IsBoolean()
  requiredManeuver: boolean;

  @IsOptional()
  @IsString()
  skillId: string | null;

  @IsString()
  @IsOptional()
  difficulty: Difficulty | null;

  @IsNumber()
  @IsOptional()
  customBonus: number | null;

  static fromEntity(modifiers: ActionMovementModifiers): ActionMovementModifiersDto {
    const dto = new ActionMovementModifiersDto();
    dto.pace = modifiers.pace;
    dto.requiredManeuver = modifiers.requiredManeuver;
    dto.skillId = modifiers.skillId;
    dto.difficulty = modifiers.difficulty;
    return dto;
  }

  static toEntity(dto: ActionMovementModifiersDto): ActionMovementModifiers {
    return new ActionMovementModifiers(dto.pace, dto.requiredManeuver, dto.skillId, dto.difficulty, dto.customBonus);
  }
}

export class ActionMovementResultDto {
  bmr: number;
  paceMultiplier: number;
  percent: number;
  distance: number;
  distanceAdjusted: number;
  critical: string | null;
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
