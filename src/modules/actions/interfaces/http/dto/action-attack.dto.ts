import { ApiProperty } from '@nestjs/swagger';
import { ActionAttack } from '../../../domain/value-objects/action-attack.vo';
import type { ActionStatus } from '../../../domain/value-objects/action-status.vo';
import { ActionAttackCalculatedDto } from './action-attack-calculated.dto';
import { ActionAttackModifiersDto } from './action-attack-modifiers.dto';
import { ActionAttackResultsDto } from './action-attack-results.dto';
import { ActionAttackRollDto } from './action-attack-roll.dto';

export class ActionAttackDto {
  @ApiProperty({ description: 'Attack type', example: 'mainHand' })
  public modifiers: ActionAttackModifiersDto;

  @ApiProperty({ description: 'The attack roll' })
  public roll: ActionAttackRollDto | undefined;

  @ApiProperty({ description: 'Calculated attack values' })
  public calculated: ActionAttackCalculatedDto | undefined;

  @ApiProperty({ description: 'Attack results' })
  public results: ActionAttackResultsDto | undefined;

  //TODO consider not exposing this
  @ApiProperty({ description: 'External attack ID', example: 'abc123', required: false })
  public externalAttackId: string | undefined;

  @ApiProperty({ description: 'Action status', example: 'pending' })
  public status: ActionStatus;

  static fromEntity(entity: ActionAttack): ActionAttackDto {
    const dto = new ActionAttackDto();
    dto.modifiers = ActionAttackModifiersDto.fromEntity(entity.modifiers);
    dto.externalAttackId = entity.externalAttackId;
    dto.status = entity.status;
    dto.roll = entity.roll ? ActionAttackRollDto.fromEntity(entity.roll) : undefined;
    dto.results = entity.results ? ActionAttackResultsDto.fromEntity(entity.results) : undefined;
    dto.calculated = entity.calculated ? ActionAttackCalculatedDto.fromEntity(entity.calculated) : undefined;
    return dto;
  }
}
