/* eslint-disable @typescript-eslint/no-unsafe-return */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

import * as pac from '../../../application/commands/prepare-attack.command';

export class PrepareAttackDto {
  @ApiProperty({ description: 'Type of the attack being prepared', example: 'main_hand' })
  @IsString()
  @IsNotEmpty()
  attackType: string;

  @IsString()
  @IsOptional()
  cover: pac.CoverType = 'none';

  @IsString()
  @IsOptional()
  restrictedQuarters: pac.RestrictedQuartersType = 'none';

  @IsString()
  @IsOptional()
  positionalSource: pac.PositionalSourceType = 'none';

  @IsString()
  @IsOptional()
  positionalTarget: pac.PositionalTargetType = 'none';

  @IsString()
  @IsOptional()
  dodge: pac.DodgeType = 'none';

  @IsOptional()
  disabledDB: boolean = false;

  @IsOptional()
  disabledShield: boolean = false;

  @IsOptional()
  disabledParry: boolean = false;

  @IsNumber()
  @IsOptional()
  customBonus: number | undefined;

  static toCommand(actionId: string, dto: PrepareAttackDto, userId: string, roles: string[]): pac.PrepareAttackCommand {
    const result = new pac.PrepareAttackCommand();
    result.actionId = actionId;
    result.attackType = dto.attackType;
    result.cover = dto.cover;
    result.restrictedQuarters = dto.restrictedQuarters;
    result.positionalSource = dto.positionalSource;
    result.positionalTarget = dto.positionalTarget;
    result.dodge = dto.dodge;
    result.disabledDB = dto.disabledDB;
    result.disabledShield = dto.disabledShield;
    result.disabledParry = dto.disabledParry;
    result.customBonus = dto.customBonus;
    result.userId = userId;
    result.roles = roles;
    return result;
  }
}
