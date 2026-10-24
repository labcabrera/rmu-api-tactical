import { ApiProperty } from '@nestjs/swagger';
import { type ActionManeuverEffect, ActionManeuverResult } from '../../../domain/value-objects/action-maneuver.vo.js';

export class ActionManeuverEffectDto {
  @ApiProperty({ example: 'penaltyUntilAbsoluteSuccess' })
  status: string;

  @ApiProperty({ required: false })
  value?: number;

  @ApiProperty({ required: false })
  modifier?: string;

  @ApiProperty({ required: false })
  rounds?: number;

  @ApiProperty({ required: false })
  roundDelay?: number;
}

export class ActionManeuverResultDto {
  @ApiProperty({ description: 'Absolute maneuvers: result code', required: false })
  result?: string;

  @ApiProperty({ description: 'Percent maneuvers: percent of this roll', required: false })
  percent?: number;

  @ApiProperty({ description: 'Result message' })
  message?: string;

  @ApiProperty({ description: 'Absolute maneuvers: effects of the result', type: [ActionManeuverEffectDto], required: false })
  effects?: ActionManeuverEffect[];

  @ApiProperty({ type: String, description: 'Percent maneuvers: severity of the critical taken', required: false, nullable: true })
  critical?: string | null;

  @ApiProperty({ description: 'Percent maneuvers: the accumulated progress reached 100', required: false })
  completed?: boolean;

  @ApiProperty({ description: 'Absolute maneuvers: unmodified 66', required: false })
  unusualEvent?: boolean;

  static fromEntity(entity: ActionManeuverResult): ActionManeuverResultDto {
    const dto = new ActionManeuverResultDto();
    dto.result = entity.result ?? undefined;
    dto.percent = entity.percent ?? undefined;
    dto.message = entity.message ?? undefined;
    dto.effects = entity.effects ?? undefined;
    dto.critical = entity.critical ?? undefined;
    dto.completed = entity.completed ?? undefined;
    dto.unusualEvent = entity.unusualEvent ?? undefined;
    return dto;
  }
}
