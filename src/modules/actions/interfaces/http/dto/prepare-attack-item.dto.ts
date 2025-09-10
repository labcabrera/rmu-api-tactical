import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  CoverType,
  DodgeType,
  PositionalSourceType,
  PositionalTargetType,
  PrepareAttackCommandItem,
  RestrictedQuartersType,
} from '../../../application/cqrs/commands/prepare-attack.command';

export class PrepareAttackItemDto {
  @IsString()
  @IsNotEmpty()
  attackName: string;

  @IsString()
  @IsNotEmpty()
  targetId: string;

  @IsNumber()
  bo: number;

  @IsOptional()
  @IsString()
  cover: CoverType | undefined;

  @IsOptional()
  @IsString()
  restrictedQuarters: RestrictedQuartersType | undefined;

  @IsOptional()
  @IsString()
  positionalSource: PositionalSourceType | undefined;

  @IsOptional()
  @IsString()
  positionalTarget: PositionalTargetType | undefined;

  @IsOptional()
  @IsString()
  dodge: DodgeType | undefined;

  @IsOptional()
  @IsNumber()
  range: number | undefined;

  @IsOptional()
  @IsBoolean()
  disabledDB: boolean | undefined;

  @IsOptional()
  @IsBoolean()
  disabledShield: boolean | undefined;

  @IsOptional()
  @IsBoolean()
  disabledParry: boolean | undefined;

  @IsOptional()
  @IsNumber()
  customBonus: number | undefined;

  static toCommandItem(dto: PrepareAttackItemDto): PrepareAttackCommandItem {
    return new PrepareAttackCommandItem(
      dto.attackName,
      dto.targetId,
      dto.bo,
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
