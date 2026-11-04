import { ApiProperty } from '@nestjs/swagger';
import {
  type ActionManeuverEffect,
  ActionManeuverResult,
  type ManeuverRollTalent,
} from '../../../domain/value-objects/action-maneuver.vo.js';

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

  @ApiProperty({ description: 'Trading: price as a percent of the asked one (50-200)', required: false })
  price?: number;

  @ApiProperty({ description: 'Leadership: outcome key of the morale table (refuses, obeys...)', required: false })
  outcome?: string;

  @ApiProperty({ description: 'Leadership: modifier to later morale rolls, and the days it lasts (game master)', required: false })
  moraleModifier?: number;

  @ApiProperty({ required: false })
  moraleModifierDays?: number;

  @ApiProperty({
    type: String,
    description: 'Talent that changed the result of the table (spec 076)',
    enum: ['unusual-luck', 'absolute-ease', 'absolute-disaster'],
    required: false,
  })
  rollTalent?: ManeuverRollTalent;

  static fromEntity(entity: ActionManeuverResult): ActionManeuverResultDto {
    const dto = new ActionManeuverResultDto();
    dto.result = entity.result ?? undefined;
    dto.percent = entity.percent ?? undefined;
    dto.message = entity.message ?? undefined;
    dto.effects = entity.effects ?? undefined;
    dto.critical = entity.critical ?? undefined;
    dto.completed = entity.completed ?? undefined;
    dto.unusualEvent = entity.unusualEvent ?? undefined;
    dto.price = entity.price ?? undefined;
    dto.outcome = entity.outcome ?? undefined;
    dto.moraleModifier = entity.moraleModifier ?? undefined;
    dto.moraleModifierDays = entity.moraleModifierDays ?? undefined;
    dto.rollTalent = entity.rollTalent ?? undefined;
    return dto;
  }
}
