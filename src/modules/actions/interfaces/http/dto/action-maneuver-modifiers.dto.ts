import { ApiProperty } from '@nestjs/swagger';
import { ActionManeuverModifiers } from '../../../domain/value-objects/action-maneuver.vo.js';
import type { Difficulty } from '../../../domain/value-objects/difficulty.vo.js';
import type { ManeuverModifierSelection } from '../../../domain/value-objects/maneuver-profile.vo.js';
import type { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo.js';

export class ActionManeuverModifiersDto {
  @ApiProperty({ description: 'Skill identifier', example: 'climbing' })
  skillId: string;

  @ApiProperty({ type: String, description: 'Specialization of the skill', required: false, nullable: true })
  specialization?: string | null;

  @ApiProperty({ type: String, description: 'Maneuver type', enum: ['absolute', 'percent'] })
  maneuverType: ManeuverType;

  @ApiProperty({ type: String, description: 'Maneuver difficulty', example: 'm', required: false })
  difficulty?: Difficulty | undefined;

  customBonus?: number | undefined;

  @ApiProperty({ type: String, description: 'How the skill uses light', enum: ['none', 'helpful', 'required', 'hiding'], required: false })
  lightModifier?: string | undefined;

  light?: string | undefined;

  @ApiProperty({ type: Boolean, description: 'Deprecated: the armor penalty comes from the character sheet', required: false })
  armorModifier?: boolean | undefined;

  @ApiProperty({ description: 'Choices for the skill catalog modifiers', required: false })
  selections?: Record<string, ManeuverModifierSelection>;

  @ApiProperty({ description: 'Conflicting maneuver: total of the passive side', required: false })
  passiveTotal?: number;

  static fromEntity(entity: ActionManeuverModifiers): ActionManeuverModifiersDto {
    const dto = new ActionManeuverModifiersDto();
    dto.skillId = entity.skillId;
    dto.specialization = entity.specialization ?? null;
    dto.maneuverType = entity.maneuverType;
    dto.difficulty = entity.difficulty;
    dto.customBonus = entity.customBonus;
    dto.lightModifier = entity.lightModifier;
    dto.light = entity.light;
    dto.armorModifier = entity.armorModifier;
    dto.selections = entity.selections;
    dto.passiveTotal = entity.passiveTotal ?? undefined;
    return dto;
  }
}
