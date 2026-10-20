import { ApiProperty } from '@nestjs/swagger';
import { ActionAttackCalculated } from '../../../domain/value-objects/action-attack-calculated.vo';
import { AttackLocation } from '../../../domain/value-objects/attack-location.vo';
import { KeyValueModifierDto } from './key-value-modifier.dto';

export class ActionAttackCalculatedDto {
  @ApiProperty({ description: 'Modifiers of the attack roll, with the plugin that added each one', type: [KeyValueModifierDto] })
  rollModifiers: KeyValueModifierDto[];

  @ApiProperty({ description: 'Modifiers of the critical rolls, with the plugin that added each one', type: [KeyValueModifierDto] })
  criticalModifiers: KeyValueModifierDto[];

  @ApiProperty({ description: 'Sum of the modifiers; once rolled, the roll plus the modifiers', example: 42 })
  rollTotal: number;

  @ApiProperty({
    description: 'The location hit by a called shot (no location is rolled otherwise)',
    required: false,
    enum: ['head', 'chest', 'abdomen', 'arms', 'legs'],
  })
  location: AttackLocation | undefined;

  @ApiProperty({ description: 'Sum of the critical modifiers, added to each critical roll', required: false, example: 1 })
  criticalAdjustment: number | undefined;

  @ApiProperty({ description: 'Whether the attack roll requires a breakage roll', required: false, example: true })
  breakageRoll: boolean | undefined;

  static fromEntity(entity: ActionAttackCalculated): ActionAttackCalculatedDto {
    const dto = new ActionAttackCalculatedDto();
    dto.rollModifiers = entity.rollModifiers ? entity.rollModifiers.map(mod => KeyValueModifierDto.fromEntity(mod)) : [];
    dto.criticalModifiers = entity.criticalModifiers ? entity.criticalModifiers.map(mod => KeyValueModifierDto.fromEntity(mod)) : [];
    dto.rollTotal = entity.rollTotal;
    dto.location = entity.location;
    dto.criticalAdjustment = entity.criticalAdjustment;
    dto.breakageRoll = entity.breakageRoll;
    return dto;
  }
}
