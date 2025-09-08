import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import * as prepareAttackCommand from '../../../application/cqrs/commands/prepare-attack.command';

export class PrepareAttackDto {
  @ApiProperty({ description: 'Type of the attack being prepared', example: 'main_hand' })
  @IsString()
  @IsNotEmpty()
  attackType: string;

  @IsString()
  @IsOptional()
  cover: prepareAttackCommand.CoverType = 'none';

  @IsString()
  @IsOptional()
  restrictedQuarters: prepareAttackCommand.RestrictedQuartersType = 'none';

  @IsString()
  @IsOptional()
  positionalSource: prepareAttackCommand.PositionalSourceType = 'none';

  @IsString()
  @IsOptional()
  positionalTarget: prepareAttackCommand.PositionalTargetType = 'none';

  @IsString()
  @IsOptional()
  dodge: prepareAttackCommand.DodgeType = 'none';

  @IsOptional()
  disabledDB: boolean = false;

  @IsOptional()
  disabledShield: boolean = false;

  @IsOptional()
  disabledParry: boolean = false;

  @IsNumber()
  @IsOptional()
  customBonus: number | undefined;

  static toCommand(actionId: string, dto: PrepareAttackDto, userId: string, roles: string[]): prepareAttackCommand.PrepareAttackCommand {
    const result = new prepareAttackCommand.PrepareAttackCommand();
    result.actionId = actionId;
    result.attackName = dto.attackType;
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
