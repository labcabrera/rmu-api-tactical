import { ApiProperty } from '@nestjs/swagger';
import { ActionAttackRoll } from '../../../domain/value-objects/action-attack-roll.vo';

export class ActionAttackRollDto {
  @ApiProperty({ description: 'The attack roll', example: 15 })
  roll: number;

  @ApiProperty({ description: 'The critical rolls as rolled, by critical key', example: { s_c_1: 42 }, required: false })
  criticalRolls: Map<string, number | undefined> | undefined;

  @ApiProperty({ type: Number, description: 'The fumble roll value if required', required: false, example: 3 })
  fumbleRoll: number | undefined;
  static fromEntity(entity: ActionAttackRoll): ActionAttackRollDto {
    const dto = new ActionAttackRollDto();
    dto.roll = entity.roll;
    dto.criticalRolls = entity.criticalRolls ? entity.criticalRolls : undefined;
    dto.fumbleRoll = entity.fumbleRoll;
    return dto;
  }
}
