import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  CoverType,
  DodgeType,
  PositionalSourceType,
  PositionalTargetType,
  PrepareAttackCommandItem,
  RestrictedQuartersType,
} from '../../../application/cqrs/commands/prepare-attack.command';
import { CalledShot } from '../../../domain/value-objects/action-attack-modifiers.vo';

export class PrepareAttackItemDto {
  @ApiProperty({ description: 'Name of the attack obtained from actor round', example: 'mainHand' })
  @IsString()
  @IsNotEmpty()
  attackName: string;

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
    description: 'Type of restricted quarters the attacker is in',
    required: false,
    enum: ['none', 'close', 'cramped', 'tight', 'confined'],
    example: 'none',
  })
  @IsOptional()
  @IsString()
  restrictedQuarters: RestrictedQuartersType | undefined;

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
    description: 'Type of dodge the target is performing',
    required: false,
    enum: ['none', 'passive', 'partial', 'full'],
    example: 'none',
  })
  @IsOptional()
  @IsString()
  dodge: DodgeType | undefined;

  @ApiProperty({ description: 'Range to the target in meters', required: false, example: 72 })
  @IsOptional()
  @IsNumber()
  range: number | undefined;

  @ApiProperty({ description: 'Whether the attack disables shield use', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  disabledShield: boolean | undefined;

  @ApiProperty({ description: 'Whether the attack disables defensive bonus', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  disabledDB: boolean | undefined;

  @ApiProperty({ description: 'Whether the attack disables parry', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  disabledParry: boolean | undefined;

  @ApiProperty({ description: 'Custom bonus to apply to the attack', required: false, example: 5 })
  @IsOptional()
  @IsNumber()
  customBonus: number | undefined;

  static toCommandItem(dto: PrepareAttackItemDto): PrepareAttackCommandItem {
    return new PrepareAttackCommandItem(
      dto.attackName,
      dto.targetId,
      dto.bo,
      dto.calledShot,
      dto.cover,
      dto.restrictedQuarters,
      dto.positionalSource,
      dto.positionalTarget,
      dto.dodge,
      dto.range,
      dto.disabledDB,
      dto.disabledShield,
      dto.disabledParry,
      dto.customBonus,
    );
  }
}
