import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { PrepareAttackCommandItem, PrepareAttackCommandModifiers } from '../../../application/cqrs/commands/prepare-attack.command.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import {
  type CalledShot,
  type ChargeSpeed,
  type Cover,
  normalizeChargeSpeed,
  type PositionalSource,
  type PositionalTarget,
  PROTECT_POSITIONS,
  type ProtectPosition,
  type RestrictedQuarters,
} from '../../../domain/value-objects/action-attack-modifiers.vo.js';
import { STYLE_CRITICAL_OPTIONS } from '../../../domain/services/style-critical-option.js';

export class PrepareAttackModifiersDto {
  @ApiProperty({ description: 'Target actor round identifier', example: 'actor-round-003' })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty({ description: 'Base offensive value for the attack', example: 42 })
  @IsNumber()
  bo: number;

  @ApiProperty({
    type: String,
    description: 'Called shot location, if any',
    required: false,
    enum: ['none', 'head', 'chest', 'abdomen', 'arms', 'legs'],
    example: 'none',
  })
  @IsOptional()
  @IsString()
  calledShot: CalledShot | undefined;

  @ApiProperty({ description: 'Penalty for the called shot (negative); -25 when not given', required: false, example: -25 })
  @IsOptional()
  @IsNumber()
  calledShotPenalty: number;
  @ApiProperty({
    type: String,
    description: 'Positional advantage the attacker has',
    required: false,
    enum: ['none', 'to_flank', 'to_rear'],
    example: 'none',
  })
  @IsOptional()
  @IsString()
  positionalSource: PositionalSource | undefined;

  @ApiProperty({
    type: String,
    description: 'Positional disadvantage the target has',
    required: false,
    enum: ['none', 'flank', 'rear'],
    example: 'none',
  })
  @IsOptional()
  @IsString()
  positionalTarget: PositionalTarget | undefined;

  @ApiProperty({
    type: String,
    description: 'Type of restricted quarters the attacker is in',
    required: false,
    enum: ['none', 'close', 'cramped', 'tight', 'confined'],
    example: 'none',
  })
  @IsOptional()
  @IsString()
  restrictedQuarters: RestrictedQuarters | undefined;

  @ApiProperty({
    type: String,
    description: 'Type of cover the target has',
    required: false,
    enum: ['none', 'soft_partial', 'soft_half', 'soft_full', 'hard_partial', 'hard_half', 'hard_full'],
    example: 'none',
  })
  @IsOptional()
  @IsString()
  cover: Cover | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether attacker is in melee (close) range', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  attackerInMelee: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether the attack disables defensive bonus', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  disabledDB: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether the attack disables shield use', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  disabledShield: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether the attack disables parry', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  disabledParry: boolean | undefined;

  @ApiProperty({ type: String, description: 'Pace applied to the attack, if any', required: false, example: 'normal' })
  @IsOptional()
  @IsString()
  pace: string | undefined;

  @ApiProperty({
    type: Boolean,
    description: 'Restricted parry (§9.6): the defender is unarmed against a weapon, or the attacker is invisible or incorporeal',
    required: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  restrictedParry: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether attacker has higher ground', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  higherGround: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether the foe is stunned', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  stunnedFoe: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether the foe is surprised', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  surprisedFoe: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether the target is prone', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  proneTarget: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether the source is prone', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  proneSource: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether attack is with off-hand', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  offHand: boolean | undefined;

  @ApiProperty({
    type: Boolean,
    description: "Ambush: the attacker's Ambush ranks add to the critical rolls",
    required: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  ambush: boolean | undefined;

  @ApiProperty({ type: Number, description: 'Range to the target in meters', required: false, example: 72 })
  @IsOptional()
  @IsNumber()
  range: number | undefined;

  @ApiProperty({ type: Number, description: 'Custom bonus to apply to the attack', required: false, example: 5 })
  @IsOptional()
  @IsNumber()
  customBonus: number | undefined;

  @ApiProperty({
    type: String,
    description: 'Charge speed, added to the attacker size (`spring` is accepted as an alias of `sprint`)',
    required: false,
    enum: ['none', 'jog', 'sprint'],
    example: 'none',
  })
  @IsOptional()
  @IsIn(['none', 'jog', 'sprint', 'spring'])
  chargeSpeed: ChargeSpeed | 'spring' | undefined;

  @ApiProperty({
    description: 'Fighting style ability that changes the critical (workspace spec 032)',
    required: false,
    enum: STYLE_CRITICAL_OPTIONS,
    example: 'leg-sweep',
  })
  @IsOptional()
  @IsIn(STYLE_CRITICAL_OPTIONS)
  styleCriticalOption: string | undefined;

  static toCommand(dto: PrepareAttackModifiersDto): PrepareAttackCommandModifiers {
    return new PrepareAttackCommandModifiers(
      dto.targetId,
      dto.bo,
      dto.calledShot,
      dto.calledShotPenalty,
      dto.positionalSource,
      dto.positionalTarget,
      dto.restrictedQuarters,
      dto.cover,
      dto.disabledDB,
      dto.disabledShield,
      dto.disabledParry,
      dto.pace,
      dto.restrictedParry,
      dto.higherGround,
      dto.stunnedFoe,
      dto.surprisedFoe,
      dto.proneTarget,
      dto.proneSource,
      dto.attackerInMelee,
      dto.offHand,
      dto.ambush,
      dto.range,
      dto.customBonus,
      dto.chargeSpeed === undefined ? undefined : normalizeChargeSpeed(dto.chargeSpeed),
      dto.styleCriticalOption,
    );
  }
}

export class PrepareAttackItemDto {
  @ApiProperty({ description: 'Name of the attack obtained from actor round', example: 'mainHand' })
  @IsString()
  @IsNotEmpty()
  attackName: string;

  @ApiProperty({ description: 'Modifiers for the attack' })
  @IsNotEmpty()
  @IsObject()
  modifiers: PrepareAttackModifiersDto;

  @ApiProperty({ description: 'Protector actor identifiers', required: false, example: ['actor-round-002'] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  protectors: string[] | null;

  @ApiProperty({
    description: 'Position of each protector (Table 9-7c), by protector identifier; `other` when not given',
    required: false,
    example: { 'actor-round-002': 'protector_between' },
  })
  @IsOptional()
  @IsObject()
  protectorPositions: Record<string, ProtectPosition> | undefined;

  static toCommand(attack: PrepareAttackItemDto): PrepareAttackCommandItem {
    Object.entries(attack.protectorPositions || {}).forEach(([protectorId, position]) => {
      if (!PROTECT_POSITIONS.includes(position)) {
        throw new ValidationError(`Invalid protect position ${position} for ${protectorId}`, 'err-invalid-protect-position');
      }
    });
    return new PrepareAttackCommandItem(
      attack.attackName,
      PrepareAttackModifiersDto.toCommand(attack.modifiers),
      attack.protectors,
      attack.protectorPositions,
    );
  }
}
