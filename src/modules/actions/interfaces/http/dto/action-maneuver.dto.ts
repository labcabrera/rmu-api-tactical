import { ApiProperty } from '@nestjs/swagger';
import { ActionManeuver } from '../../../domain/value-objects/action-maneuver.vo';
import { ActionManeuverModifiersDto } from './action-maneuver-modifiers.dto';
import { ActionManeuverResultDto } from './action-maneuver-result.dto';
import { ActionRollDto } from './action-roll.dto';

export class ActionManeuverDto {
  modifiers: ActionManeuverModifiersDto;
  roll?: ActionRollDto;
  result?: ActionManeuverResultDto;

  @ApiProperty({ description: 'Percent maneuvers: percent accumulated with the actions it continues', required: false })
  progress?: number;

  @ApiProperty({ description: 'Percent maneuver this one continues', required: false })
  continuesActionId?: string;

  static fromEntity(entity: ActionManeuver): ActionManeuverDto {
    const dto = new ActionManeuverDto();
    dto.modifiers = ActionManeuverModifiersDto.fromEntity(entity.modifiers);
    dto.roll = entity.roll ? ActionRollDto.fromEntity(entity.roll) : undefined;
    dto.result = entity.result ? ActionManeuverResultDto.fromEntity(entity.result) : undefined;
    dto.progress = entity.progress ?? undefined;
    dto.continuesActionId = entity.continuesActionId ?? undefined;
    return dto;
  }
}
