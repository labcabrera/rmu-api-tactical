import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, ValidateNested, IsNumber } from 'class-validator';

import { CreateRaceCommand } from 'src/modules/core/application/commands/create-race.command';
import { RaceStatBonusDto, RaceResistancesDto, SexBasedAttributeDto } from './race.dto';

export class CreateRaceDto {
  @ApiProperty({ description: 'Unique identifier for the race', example: 'elf' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Name of the race', example: 'Elf' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Realm of the race', example: 'lotr' })
  @IsString()
  @IsNotEmpty()
  realm: string;

  @ApiProperty({ description: 'Size of the race', example: 'Medium' })
  @IsString()
  @IsNotEmpty()
  size: string;

  @ApiProperty({ description: 'Default stat bonus for the race' })
  @ValidateNested()
  @Type(() => RaceStatBonusDto)
  defaultStatBonus: RaceStatBonusDto;

  @ApiProperty({ description: 'Resistances of the race' })
  @ValidateNested()
  @Type(() => RaceResistancesDto)
  resistances: RaceResistancesDto;

  @ApiProperty({ description: 'Average height of the race by sex' })
  @ValidateNested()
  @Type(() => SexBasedAttributeDto)
  averageHeight: SexBasedAttributeDto;

  @ApiProperty({ description: 'Average weight of the race by sex' })
  @ValidateNested()
  @Type(() => SexBasedAttributeDto)
  averageWeight: SexBasedAttributeDto;

  @ApiProperty({ description: 'Stride bonus for the race' })
  @IsNumber()
  strideBonus: number;

  @ApiProperty({ description: 'Endurance bonus for the race' })
  @IsNumber()
  enduranceBonus: number;

  @ApiProperty({ description: 'Recovery multiplier for the race' })
  @IsNumber()
  recoveryMultiplier: number;

  @ApiProperty({ description: 'Base hits for the race' })
  @IsNumber()
  baseHits: number;

  @ApiProperty({ description: 'Bonus development points for the race' })
  @IsNumber()
  bonusDevPoints: number;

  @ApiProperty({ description: 'Description of the race' })
  @IsString()
  @IsNotEmpty()
  description: string;

  static toCommand(dto: CreateRaceDto, userId: string, roles: string[]): CreateRaceCommand {
    return new CreateRaceCommand(
      dto.id,
      dto.name,
      dto.realm,
      dto.size,
      dto.defaultStatBonus,
      dto.resistances,
      dto.averageHeight,
      dto.averageWeight,
      dto.strideBonus,
      dto.enduranceBonus,
      dto.recoveryMultiplier,
      dto.baseHits,
      dto.bonusDevPoints,
      dto.description,
      userId,
      roles,
    );
  }
}
