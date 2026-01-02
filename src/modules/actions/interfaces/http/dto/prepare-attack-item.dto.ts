import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import {
  CoverType,
  DodgeType,
  PositionalSourceType,
  PositionalTargetType,
  PrepareAttackCommandItem,
  PrepareAttackCommandModifiers,
  RestrictedQuartersType,
} from '../../../application/cqrs/commands/prepare-attack.command';
import { CalledShot } from '../../../domain/value-objects/action-attack-modifiers.vo';

export class PrepareAttackModifiersDto {
  @ApiProperty({ description: 'Target actor round identifier', example: 'actor-round-003' })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty({ description: 'Base offensive value for the attack', example: 42 })
  @IsNumber()
  bo: number;

  @ApiProperty({
    description: 'Called shot location, if any',
    required: false,
    enum: ['none', 'head', 'body', 'arms', 'legs'],
    example: 'none',
  })
  @IsOptional()
  @IsString()
  calledShot: CalledShot | undefined;

  @ApiProperty({ description: 'Penalty for the called shot, if any', required: false, example: 0 })
  @IsOptional()
  @IsNumber()
  calledShotPenalty: number;
  @ApiProperty({
    description: 'Positional advantage the attacker has',
    required: false,
    enum: ['none', 'to_flank', 'to_rear'],
    example: 'none',
  })
  @IsOptional()
  @IsString()
  positionalSource: PositionalSourceType | undefined;

  @ApiProperty({
    description: 'Positional disadvantage the target has',
    required: false,
    enum: ['none', 'flank', 'rear'],
    example: 'none',
  })
  @IsOptional()
  @IsString()
  positionalTarget: PositionalTargetType | undefined;

  @ApiProperty({
    description: 'Type of restricted quarters the attacker is in',
    required: false,
    enum: ['none', 'close', 'cramped', 'tight', 'confined'],
    example: 'none',
  })
  @IsOptional()
  @IsString()
  restrictedQuarters: RestrictedQuartersType | undefined;

  @ApiProperty({
    description: 'Type of cover the target has',
    required: false,
    enum: ['none', 'soft_partial', 'soft_half', 'soft_full', 'hard_partial', 'hard_half', 'hard_full'],
    example: 'none',
  })
  @IsOptional()
  @IsString()
  cover: CoverType | undefined;

  @ApiProperty({
    description: 'Type of dodge the target is performing',
    required: false,
    enum: ['none', 'passive', 'partial', 'full'],
    example: 'none',
  })
  @IsOptional()
  @IsString()
  dodge: DodgeType | undefined;

  @ApiProperty({ description: 'Whether attacker is in melee (close) range', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  attackerInMelee: boolean | undefined;

  @ApiProperty({ description: 'Whether the attack disables defensive bonus', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  disabledDB: boolean | undefined;

  @ApiProperty({ description: 'Whether the attack disables shield use', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  disabledShield: boolean | undefined;

  @ApiProperty({ description: 'Whether the attack disables parry', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  disabledParry: boolean | undefined;

  @ApiProperty({ description: 'Pace applied to the attack, if any', required: false, example: 'normal' })
  @IsOptional()
  @IsString()
  pace: string | undefined;

  @ApiProperty({ description: 'Whether parry is restricted for this attack', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  restrictedParry: boolean | undefined;

  @ApiProperty({ description: 'Whether attacker has higher ground', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  higherGround: boolean | undefined;

  @ApiProperty({ description: 'Whether the foe is stunned', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  stunnedFoe: boolean | undefined;

  @ApiProperty({ description: 'Whether the foe is surprised', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  surprisedFoe: boolean | undefined;

  @ApiProperty({ description: 'Whether the target is prone', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  proneTarget: boolean | undefined;

  @ApiProperty({ description: 'Whether the source is prone', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  proneSource: boolean | undefined;

  @ApiProperty({ description: 'Whether attack is with off-hand', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  offHand: boolean | undefined;

  @ApiProperty({ description: 'Whether the attack is an ambush', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  ambush: boolean | undefined;

  @ApiProperty({ description: 'Range to the target in meters', required: false, example: 72 })
  @IsOptional()
  @IsNumber()
  range: number | undefined;

  @ApiProperty({ description: 'Custom bonus to apply to the attack', required: false, example: 5 })
  @IsOptional()
  @IsNumber()
  customBonus: number | undefined;

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
      dto.dodge,
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

  static toCommand(attack: PrepareAttackItemDto): PrepareAttackCommandItem {
    return new PrepareAttackCommandItem(attack.attackName, PrepareAttackModifiersDto.toCommand(attack.modifiers));
  }
}
