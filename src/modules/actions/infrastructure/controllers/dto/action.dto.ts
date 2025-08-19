import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../../../shared/infrastructure/controller/dto';
import { Action } from '../../../domain/entities/action.entity';

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

  phaseStart?: number;
  actionPoints?: number;
  // attackInfo?: ActionAttackInfo;
  // attacks?: ActionAttack[];
  description?: string;
  // result?: ActionResult;

  static fromEntity(entity: Action) {
    const dto = new ActionDto();
    dto.id = entity.id;
    dto.gameId = entity.gameId;
    dto.characterId = entity.characterId;
    dto.round = entity.round;
    dto.actionType = entity.actionType;
    dto.phaseStart = entity.phaseStart;
    dto.actionPoints = entity.actionPoints;
    // dto.attackInfo = entity.attackInfo;
    // dto.attacks = entity.attacks;
    dto.description = entity.description;
    // dto.result = entity.result;
    return dto;
  }
}

export class ActionPageDto {
  @ApiProperty({ type: [ActionDto], description: 'Actions', isArray: true })
  content: ActionDto[];

  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
