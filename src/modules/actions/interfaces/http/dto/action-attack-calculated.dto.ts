import { ApiProperty } from '@nestjs/swagger';
import { ActionAttackCalculated } from '../../../domain/value-objects/action-attack-calculated.vo';
import { AttackLocation } from '../../../domain/value-objects/attack-location.vo';
import { KeyValueModifierDto } from './key-value-modifier.dto';

export class ActionAttackCalculatedDto {
  @ApiProperty({ description: 'Total attack value after applying all modifiers' })
  rollModifiers: KeyValueModifierDto[];

  @ApiProperty({ description: 'Modifiers applied to critical rolls', required: false })
  criticalModifiers: KeyValueModifierDto[];

  @ApiProperty({ description: 'Sum of all modifiers', example: 42 })
  rollTotal: number;

  @ApiProperty({ description: 'Whether a location roll is required', required: true, example: false })
  requiredLocationRoll: boolean;

  @ApiProperty({ description: 'The location hit by the attack', required: false })
  location: AttackLocation | undefined;

  @ApiProperty({ description: 'Adjustment applied to critical rolls', required: false, example: 1 })
  criticalAdjustment: number | undefined;

  static fromEntity(entity: ActionAttackCalculated): ActionAttackCalculatedDto {
    const dto = new ActionAttackCalculatedDto();
    dto.rollModifiers = entity.rollModifiers ? entity.rollModifiers.map(mod => KeyValueModifierDto.fromEntity(mod)) : [];
    dto.criticalModifiers = entity.criticalModifiers ? entity.criticalModifiers.map(mod => KeyValueModifierDto.fromEntity(mod)) : [];
    dto.rollTotal = entity.rollTotal;
    dto.location = entity.location;
    dto.requiredLocationRoll = entity.requiredLocationRoll;
    dto.criticalAdjustment = entity.criticalAdjustment;
    return dto;
  }
}
