import { ApiProperty } from '@nestjs/swagger';
import { ActionManeuver, ActionManeuverResult } from '../../../domain/entities/action-maneuver.vo';
import type { ActionStatus } from '../../../domain/entities/action-status.vo';
import { ManeuverDifficulty } from '../../../domain/entities/maneuver-dificulty.vo';
import type { ManeuverType } from '../../../domain/entities/maneuver-type.vo';

export class ActionManeuverResultDto {
  @ApiProperty({ description: 'Bonus modifiers' })
  bonus: { [key: string]: number };

  @ApiProperty({ description: 'Maneuver roll' })
  roll: number;

  @ApiProperty({ description: 'Maneuver result' })
  result: number;

  @ApiProperty({ description: 'Maneuver description' })
  description: string;

  static fromEntity(entity: ActionManeuverResult): ActionManeuverResultDto {
    const dto = new ActionManeuverResultDto();
    dto.bonus = entity.bonus;
    dto.roll = entity.roll;
    dto.result = entity.result;
    dto.description = entity.description;
    return dto;
  }
}

export class ActionManeuverDto {
  @ApiProperty({ description: 'Skill identifier', example: 'skill-01' })
  skillId: string;

  @ApiProperty({ description: 'Maneuver type', example: 'dodge' })
  maneuverType: ManeuverType;

  @ApiProperty({ description: 'Maneuver difficulty', example: 'average', required: false })
  difficulty: ManeuverDifficulty | undefined;

  @ApiProperty({ description: 'Maneuver result', required: false })
  result: ActionManeuverResultDto | undefined;

  @ApiProperty({ description: 'Maneuver status', example: 'declared' })
  status: ActionStatus;

  static fromEntity(entity: ActionManeuver): ActionManeuverDto {
    const dto = new ActionManeuverDto();
    dto.skillId = entity.skillId;
    dto.maneuverType = entity.maneuverType;
    dto.difficulty = entity.difficulty;
    dto.result = entity.result ? ActionManeuverResultDto.fromEntity(entity.result) : undefined;
    dto.status = entity.status;
    return dto;
  }
}
