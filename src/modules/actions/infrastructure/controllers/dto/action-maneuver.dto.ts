import {
  ActionManeuver,
  ActionManeuverResult,
  ActionStatus,
  ManeuverDifficulty,
  ManeuverType,
} from '../../../domain/entities/action.entity';

export class ActionManeuverResultDto {
  bonus: { [key: string]: number };
  roll: number;
  result: number;
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
  skillId: string;
  maneuverType: ManeuverType;
  difficulty: ManeuverDifficulty | undefined;
  result: ActionManeuverResultDto | undefined;
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
