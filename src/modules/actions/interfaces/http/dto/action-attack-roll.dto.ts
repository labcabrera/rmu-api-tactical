import { ApiProperty } from '@nestjs/swagger';
import { ActionAttackRoll } from '../../../domain/value-objects/action-attack-roll.vo';

export class ActionAttackRollDto {
  @ApiProperty({ description: 'The attack roll', example: 15 })
  roll: number;

  @ApiProperty({ description: 'Numeric roll value for location determination', required: false, example: 12 })
  locationRoll: number | undefined;

  @ApiProperty({ description: 'The critical rolls', example: { s_c_1: 42 }, required: false })
  criticalRolls: Map<string, number | undefined> | undefined;

  @ApiProperty({ description: 'The fumble roll value if required', required: false, example: 3 })
  fumbleRoll: number | undefined;
  static fromEntity(entity: ActionAttackRoll): ActionAttackRollDto {
    const dto = new ActionAttackRollDto();
    dto.roll = entity.roll;
    dto.locationRoll = entity.locationRoll;
    dto.criticalRolls = entity.criticalRolls ? entity.criticalRolls : undefined;
    dto.fumbleRoll = entity.fumbleRoll;
    return dto;
  }
}
