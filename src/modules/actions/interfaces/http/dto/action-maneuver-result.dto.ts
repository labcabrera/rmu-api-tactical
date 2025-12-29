import { ApiProperty } from '@nestjs/swagger';
import { ActionManeuverResult } from '../../../domain/value-objects/action-maneuver.vo';

export class ActionManeuverResultDto {
  @ApiProperty({ description: 'Bonus modifiers' })
  result?: string;

  @ApiProperty({ description: 'Percent value' })
  percent?: number;

  @ApiProperty({ description: 'Result message' })
  message?: string;

  static fromEntity(entity: ActionManeuverResult): ActionManeuverResultDto {
    const dto = new ActionManeuverResultDto();
    dto.result = entity.result;
    dto.percent = entity.percent;
    dto.message = entity.message;
    return dto;
  }
}
