import { ApiProperty } from '@nestjs/swagger';
import { ActionAttackRoll } from '../../../domain/value-objects/action-attack.vo';
import { AttackLocation } from '../../../domain/value-objects/attack-location.vo';

export class ActionAttackRollDto {
  @ApiProperty({ description: 'The attack roll', example: 15 })
  roll: number;

  @ApiProperty({ description: 'The location of the attack', example: 'head', required: false })
  location: AttackLocation | undefined;

  @ApiProperty({ description: 'The critical rolls', example: { s_c_1: 42 }, required: false })
  criticalRolls: Record<string, number | undefined> | undefined;

  static fromEntity(entity: ActionAttackRoll): ActionAttackRoll {
    const dto = new ActionAttackRollDto();
    dto.roll = entity.roll;
    dto.location = entity.location ? entity.location : undefined;
    dto.criticalRolls = entity.criticalRolls ? entity.criticalRolls : undefined;
    return dto;
  }
}
