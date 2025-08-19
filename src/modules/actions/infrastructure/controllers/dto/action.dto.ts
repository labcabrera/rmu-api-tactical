import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../../../shared/infrastructure/controller/dto';
import { Action } from '../../../domain/entities/action.entity';
import { ActionAttackDto } from './action-attack.dto';

export class ActionDto {
  @ApiProperty({ description: 'Action identifier' })
  id: string;

  @ApiProperty({ description: 'Game identifier' })
  gameId: string;

  @ApiProperty({ description: 'Character identifier' })
  characterId: string;

  @ApiProperty({ description: 'The round number in which the action takes place' })
  round: number;

  @ApiProperty({ description: 'Action type' })
  actionType: string;

  phaseStart: number;

  actionPoints: number;

  attacks: ActionAttackDto[] | undefined;

  description?: string;

  static fromEntity(entity: Action) {
    const dto = new ActionDto();
    dto.id = entity.id;
    dto.gameId = entity.gameId;
    dto.characterId = entity.characterId;
    dto.round = entity.round;
    dto.actionType = entity.actionType;
    dto.phaseStart = entity.phaseStart;
    dto.actionPoints = entity.actionPoints;
    dto.attacks = entity.attacks ? entity.attacks.map((attack) => ActionAttackDto.fromEntity(attack)) : undefined;
    dto.description = entity.description;
    return dto;
  }
}

export class ActionPageDto {
  @ApiProperty({ type: [ActionDto], description: 'Actions', isArray: true })
  content: ActionDto[];

  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
