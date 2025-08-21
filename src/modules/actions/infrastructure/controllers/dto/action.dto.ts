import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../../../shared/infrastructure/controller/dto';
import * as actionEntity from '../../../domain/entities/action.entity';
import { ActionAttackDto } from './action-attack.dto';
import { ActionManeuverDto } from './action-maneuver.dto';

export class ActionDto {
  @ApiProperty({ description: 'Action identifier', example: 'action-123' })
  id: string;

  @ApiProperty({ description: 'Game identifier', example: 'game-456' })
  gameId: string;

  @ApiProperty({ description: 'Action status', example: 'declared' })
  status: actionEntity.ActionStatus;

  @ApiProperty({ description: 'Character identifier', example: 'character-789' })
  actorId: string;

  @ApiProperty({ description: 'The round number in which the action takes place', example: 1 })
  round: number;

  @ApiProperty({ description: 'Action type', example: 'attack' })
  actionType: actionEntity.ActionType;

  @ApiProperty({ description: 'Phase start', example: 1 })
  phaseStart: number;

  @ApiProperty({ description: 'Action points', example: 2 })
  actionPoints: number;

  @ApiProperty({ description: 'Action attacks', type: [ActionAttackDto], required: false })
  attacks: ActionAttackDto[] | undefined;

  @ApiProperty({ description: 'Action maneuver', type: ActionManeuverDto, required: false })
  maneuver: ActionManeuverDto | undefined;

  @ApiProperty({ description: 'Action description' })
  description?: string;

  static fromEntity(entity: actionEntity.Action) {
    const dto = new ActionDto();
    dto.id = entity.id;
    dto.gameId = entity.gameId;
    dto.actorId = entity.actorId;
    dto.status = entity.status;
    dto.round = entity.round;
    dto.actionType = entity.actionType;
    dto.phaseStart = entity.phaseStart;
    dto.actionPoints = entity.actionPoints;
    dto.attacks = entity.attacks ? entity.attacks.map((attack) => ActionAttackDto.fromEntity(attack)) : undefined;
    dto.maneuver = entity.maneuver ? ActionManeuverDto.fromEntity(entity.maneuver) : undefined;
    return dto;
  }
}

export class ActionPageDto {
  @ApiProperty({ type: [ActionDto], description: 'Actions', isArray: true })
  content: ActionDto[];

  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
