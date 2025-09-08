import { ApiProperty } from '@nestjs/swagger';
import { ActionAttack } from '../../../domain/entities/action-attack.vo';
import * as actionEntity from '../../../domain/entities/action.aggregate';

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

  static fromEntity(entity: ActionAttack): ActionAttackDto {
    const dto = new ActionAttackDto();
    dto.attackId = entity.attackId;
    dto.attackName = entity.attackName;
    dto.targetId = entity.targetId;
    dto.parry = entity.parry;
    dto.status = entity.status;
    return dto;
  }
}
