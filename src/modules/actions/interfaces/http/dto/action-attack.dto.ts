import { ApiProperty } from '@nestjs/swagger';
import { ActionAttack } from '../../../domain/entities/action-attack.vo';
import type { ActionStatus } from '../../../domain/entities/action-status.vo';
import { ActionAttackCalculatedDto } from './action-attack-calculated.dto';
import { ActionAttackModifiersDto } from './action-attack-modifiers.dto';
import { ActionAttackParryDto } from './action-attack-parry.dto';

export class ActionAttackDto {
  @ApiProperty({ description: 'Attack type', example: 'mainHand' })
  public modifiers: ActionAttackModifiersDto;

  @ApiProperty({ description: 'List of parries', type: [ActionAttackParryDto] })
  public parries: ActionAttackParryDto[];

  @ApiProperty({ description: 'Calculated attack values' })
  public calculated: ActionAttackCalculatedDto | undefined;

  //TODO consider not exposing this
  @ApiProperty({ description: 'External attack ID', example: 'abc123', required: false })
  public externalAttackId: string | undefined;

  @ApiProperty({ description: 'Action status', example: 'pending' })
  public status: ActionStatus;

  static fromEntity(entity: ActionAttack): ActionAttackDto {
    const dto = new ActionAttackDto();
    dto.modifiers = ActionAttackModifiersDto.fromEntity(entity.modifiers);
    dto.parries = entity.parries ? entity.parries.map((parry) => ActionAttackParryDto.fromEntity(parry)) : [];
    dto.externalAttackId = entity.externalAttackId;
    dto.status = entity.status;
    dto.calculated = entity.calculated ? ActionAttackCalculatedDto.fromEntity(entity.calculated) : undefined;
    return dto;
  }
}
