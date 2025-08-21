import { ApiProperty } from '@nestjs/swagger';
import * as actionEntity from '../../../domain/entities/action.entity';

export class ActionAttackDto {
  @ApiProperty({ description: 'Attack type', example: 'mainHand' })
  attackName: string;

  @ApiProperty({ description: 'Target identifier', example: 'target-01' })
  targetId: string;

  @ApiProperty({ description: 'Parry value', example: 5 })
  parry: number;

  @ApiProperty({ description: 'Attack status', example: 'declared' })
  status: actionEntity.ActionStatus;

  @ApiProperty({ description: 'External identifier of the attack', example: 'attack-01' })
  attackId: string | undefined;

  static fromEntity(entity: actionEntity.ActionAttack): ActionAttackDto {
    const dto = new ActionAttackDto();
    dto.attackId = entity.attackId;
    dto.attackName = entity.attackName;
    dto.targetId = entity.targetId;
    dto.parry = entity.parry;
    dto.status = entity.status;
    return dto;
  }
}
