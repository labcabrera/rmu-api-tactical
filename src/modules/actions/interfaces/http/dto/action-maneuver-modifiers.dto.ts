import { ApiProperty } from '@nestjs/swagger';
import { ActionManeuverModifiers } from '../../../domain/value-objects/action-maneuver.vo';
import { Difficulty } from '../../../domain/value-objects/dificulty.vo';
import type { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo';

export class ActionManeuverModifiersDto {
  @ApiProperty({ description: 'Skill identifier', example: 'skill-01' })
  skillId: string;

  @ApiProperty({ description: 'Maneuver type', example: 'dodge' })
  maneuverType: ManeuverType;

  @ApiProperty({ description: 'Maneuver difficulty', example: 'average', required: false })
  difficulty?: Difficulty | undefined;

  customBonus?: number | undefined;

  lightModifier?: string | undefined;

  light?: string | undefined;

  armorModifier?: boolean | undefined;

  static fromEntity(entity: ActionManeuverModifiers): ActionManeuverModifiersDto {
    const dto = new ActionManeuverModifiersDto();
    dto.skillId = entity.skillId;
    dto.maneuverType = entity.maneuverType;
    dto.difficulty = entity.difficulty;
    dto.customBonus = entity.customBonus;
    dto.lightModifier = entity.lightModifier;
    dto.light = entity.light;
    dto.armorModifier = entity.armorModifier;
    return dto;
  }
}
