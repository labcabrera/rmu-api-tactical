import { ApiProperty } from '@nestjs/swagger';
import { ActionAttackCalculated } from '../../../domain/value-objects/action-attack-calculated.vo.js';
import type { AttackLocation } from '../../../domain/value-objects/attack-location.vo.js';
import { KeyValueModifierDto } from './key-value-modifier.dto.js';
import { SkippedRuleDto } from './skipped-rule.dto.js';
import { EffectivePaceDto } from './effective-pace.dto.js';

export class ActionAttackCalculatedDto {
  @ApiProperty({ description: 'Modifiers of the attack roll, with the plugin that added each one', type: [KeyValueModifierDto] })
  rollModifiers: KeyValueModifierDto[];

  @ApiProperty({ description: 'Modifiers of the critical rolls, with the plugin that added each one', type: [KeyValueModifierDto] })
  criticalModifiers: KeyValueModifierDto[];

  @ApiProperty({ description: 'Sum of the modifiers; once rolled, the roll plus the modifiers', example: 42 })
  rollTotal: number;

  @ApiProperty({
    type: String,
    description:
      'The location hit: the called one or, against a target with armour by location, the one of the critical roll sent ' +
      'with the attack roll (spec 077). Otherwise none until a critical hits one',
    required: false,
    enum: ['head', 'chest', 'abdomen', 'arms', 'legs'],
  })
  location: AttackLocation | undefined;

  @ApiProperty({ type: Number, description: 'Sum of the critical modifiers, added to each critical roll', required: false, example: 1 })
  criticalAdjustment: number | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether the attack roll requires a breakage roll', required: false, example: true })
  breakageRoll: boolean | undefined;

  @ApiProperty({
    type: Number,
    description: "Fumble range of the attack roll: the weapon's, widened by the target's Foiler",
    required: false,
    example: 4,
  })
  fumble: number | undefined;

  @ApiProperty({ description: 'Rules that did not apply to the attack, and why', type: [SkippedRuleDto], required: false })
  skipped: SkippedRuleDto[];

  @ApiProperty({
    type: Number,
    description:
      'Spec 077: the unmodified critical roll sent with the attack roll that decided the location; the criticals of the ' +
      'attack are rolled with it (another roll is err-critical-roll-location-fixed)',
    required: false,
    example: 81,
  })
  locationRoll: number | undefined;

  @ApiProperty({
    description:
      'Spec 080: the pace the attack was prepared with, the faster of modifiers.pace and the free movement of the ' +
      'attacker at the same time (source free-movement, with its movementId). Missing without a pace',
    type: EffectivePaceDto,
    required: false,
  })
  pace: EffectivePaceDto | undefined;

  static fromEntity(entity: ActionAttackCalculated): ActionAttackCalculatedDto {
    const dto = new ActionAttackCalculatedDto();
    dto.rollModifiers = entity.rollModifiers ? entity.rollModifiers.map(mod => KeyValueModifierDto.fromEntity(mod)) : [];
    dto.criticalModifiers = entity.criticalModifiers ? entity.criticalModifiers.map(mod => KeyValueModifierDto.fromEntity(mod)) : [];
    dto.rollTotal = entity.rollTotal;
    dto.location = entity.location;
    dto.criticalAdjustment = entity.criticalAdjustment;
    dto.breakageRoll = entity.breakageRoll;
    dto.fumble = entity.fumble;
    dto.skipped = (entity.skipped ?? []).map(rule => SkippedRuleDto.fromEntity(rule));
    dto.locationRoll = entity.locationRoll;
    dto.pace = entity.pace ? EffectivePaceDto.fromEntity(entity.pace) : undefined;
    return dto;
  }
}
