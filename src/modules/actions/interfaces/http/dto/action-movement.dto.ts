import type { LightType } from '../../../domain/value-objects/light-type.vo.js';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  ActionMovement,
  ActionMovementModifiers,
  ActionMovementResult,
  type BmrMultiplier,
  GRAPPLE_FEATS,
  type GrappleFeat,
} from '../../../domain/value-objects/action-movement.vo.js';
import type { Difficulty } from '../../../domain/value-objects/difficulty.vo.js';
import type { Pace } from '../../../domain/value-objects/pace.vo.js';
import { ActionRollDto } from './action-roll.dto.js';

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
  @ApiProperty({
    type: String,
    required: false,
    description: 'Required in a free movement. A normal movement only sends `dash`; else its pace comes from its AP (workspace spec 081)',
    example: 'walk',
  })
  @IsOptional()
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

  @ApiProperty({
    type: String,
    description: 'Light of the environment (Table 5-1), helpful for movement',
    required: false,
    example: 'dark',
  })
  @IsString()
  @IsOptional()
  light?: LightType | null;

  @ApiProperty({
    type: String,
    enum: GRAPPLE_FEATS,
    required: false,
    description: 'Spec 077: Feat of Strength of a grappled actor or its grappler to move away (required while grappled)',
  })
  @IsOptional()
  @IsIn(GRAPPLE_FEATS)
  grappleFeat?: GrappleFeat | null;

  @ApiProperty({ required: false, description: 'Spec 081: moving backwards, at half speed and up to jog' })
  @IsOptional()
  @IsBoolean()
  backwards?: boolean | null;

  static fromEntity(modifiers: ActionMovementModifiers): ActionMovementModifiersDto {
    const dto = new ActionMovementModifiersDto();
    dto.pace = modifiers.pace;
    dto.requiredManeuver = modifiers.requiredManeuver;
    dto.skillId = modifiers.skillId;
    dto.difficulty = modifiers.difficulty;
    dto.customBonus = modifiers.customBonus;
    dto.light = modifiers.light ?? null;
    if (modifiers.grappleFeat) dto.grappleFeat = modifiers.grappleFeat;
    if (modifiers.backwards) dto.backwards = true;
    return dto;
  }

  static toEntity(dto: ActionMovementModifiersDto): ActionMovementModifiers {
    return new ActionMovementModifiers(
      dto.pace,
      dto.requiredManeuver,
      dto.skillId,
      dto.difficulty,
      dto.customBonus,
      dto.light,
      dto.grappleFeat ?? null,
      dto.backwards ?? null,
    );
  }
}

export class ActionMovementResultDto {
  bmr: number;
  paceMultiplier: number | null;
  percent: number;
  distance: number;
  distanceAdjusted: number;
  critical: string | null;
  description: string;
  /** What changed the BMR (spec 077): half movement, concentration. */
  bmrMultipliers?: BmrMultiplier[];

  static fromEntity(calculated: ActionMovementResult): ActionMovementResultDto {
    const dto = new ActionMovementResultDto();
    dto.bmr = calculated.bmr;
    dto.paceMultiplier = calculated.paceMultiplier;
    dto.percent = calculated.percent;
    dto.distance = calculated.distance;
    dto.distanceAdjusted = calculated.distanceAdjusted;
    dto.critical = calculated.critical;
    dto.description = calculated.description;
    if (calculated.bmrMultipliers?.length) dto.bmrMultipliers = calculated.bmrMultipliers.map(each => ({ ...each }));
    return dto;
  }
}
