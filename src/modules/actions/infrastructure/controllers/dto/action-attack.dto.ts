import { ApiProperty } from '@nestjs/swagger';
import * as actionEntity from '../../../domain/entities/action.entity';

export class ActionAttackDto {
  @ApiProperty({ description: 'Attack type', example: 'mainHand' })
  attackType: string;

  @ApiProperty({ description: 'Target identifier', example: 'target-01' })
  targetId: string;

  @ApiProperty({ description: 'Parry value', example: 5 })
  parry: number;

  @ApiProperty({ description: 'Attack status', example: 'declared' })
  status: actionEntity.AttackStatus;

  static fromEntity(entity: actionEntity.ActionAttack): ActionAttackDto {
    const dto = new ActionAttackDto();
    dto.attackType = entity.attackType;
    dto.targetId = entity.targetId;
    dto.parry = entity.parry;
    dto.status = entity.status;
    return dto;
  }
}
