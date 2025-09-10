import { ApiProperty } from '@nestjs/swagger';
import { ActionAttack } from '../../../domain/entities/action-attack.vo';
import type { ActionStatus } from '../../../domain/entities/action-status.vo';
import { ActionAttackCalculatedDto } from './action-attack-calculated.dto';
import { ActionAttackModifiersDto } from './action-attack-modifiers.dto';

export class ActionAttackDto {
  @ApiProperty({ description: 'Attack type', example: 'mainHand' })
  public modifiers: ActionAttackModifiersDto;

  @ApiProperty({ description: 'External attack ID', example: 'abc123', required: false })
  public externalAttackId: string | undefined;

  @ApiProperty({ description: 'Calculated attack values' })
  public calculated: ActionAttackCalculatedDto | undefined;

  @ApiProperty({ description: 'Action status', example: 'pending' })
  public status: ActionStatus;

  static fromEntity(entity: ActionAttack): ActionAttackDto {
    const dto = new ActionAttackDto();
    dto.modifiers = ActionAttackModifiersDto.fromEntity(entity.modifiers);
    dto.externalAttackId = entity.externalAttackId;
    dto.status = entity.status;
    dto.calculated = entity.calculated ? ActionAttackCalculatedDto.fromEntity(entity.calculated) : undefined;
    return dto;
  }
}
