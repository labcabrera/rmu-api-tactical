import { ActionManeuver } from '../../../domain/value-objects/action-maneuver.vo';
import { ActionManeuverModifiersDto } from './action-maneuver-modifiers.dto';
import { ActionManeuverResultDto } from './action-maneuver-result.dto';
import { ActionRollDto } from './action-roll.dto';

export class ActionManeuverDto {
  modifiers: ActionManeuverModifiersDto;
  roll?: ActionRollDto;
  result?: ActionManeuverResultDto;

  static fromEntity(entity: ActionManeuver): ActionManeuverDto {
    const dto = new ActionManeuverDto();
    dto.modifiers = ActionManeuverModifiersDto.fromEntity(entity.modifiers);
    dto.roll = entity.roll ? ActionRollDto.fromEntity(entity.roll) : undefined;
    // dto.result = ActionManeuverResultDto.fromValueObject(entity.result);
    return dto;
  }
}
