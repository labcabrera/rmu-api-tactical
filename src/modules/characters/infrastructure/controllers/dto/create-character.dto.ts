import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsObject, IsString, ValidateNested } from 'class-validator';

import { CreateCharacterCommand } from '../../../application/commands/create-character.command';
import { CharacterStatistics } from '../../../domain/entities/character.entity';
import { CharacterEnduranceCreationDto } from './character-endurance.dto';
import { CharacterInfoDto } from './character-info.dto';
import { CharacterMovementCreationDto } from './character-movement-dto';

export class CreateCharacterDto {
  @ApiProperty({ description: 'Character name', example: 'Foo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Game identifier', example: 'game-01' })
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @ApiProperty({ description: 'Character faction', example: 'Gondor' })
  @IsString()
  @IsNotEmpty()
  faction: string;

  @ApiProperty({ description: 'Character information', type: CharacterInfoDto })
  @ValidateNested()
  @Type(() => CharacterInfoDto)
  @IsObject()
  info: CharacterInfoDto;

  statistics: CharacterStatistics;

  @ApiProperty({ description: 'Character movement', type: CharacterMovementCreationDto })
  @ValidateNested()
  @Type(() => CharacterMovementCreationDto)
  @IsObject()
  movement: CharacterMovementCreationDto;

  @ApiProperty({ description: 'Character endurance', type: CharacterEnduranceCreationDto })
  @ValidateNested()
  @Type(() => CharacterEnduranceCreationDto)
  @IsObject()
  endurance: CharacterEnduranceCreationDto;

  maxEndurance: number;

  maxHP: number;

  skills?: any;

  items?: any;

  static toCommand(dto: CreateCharacterDto, userId: string, roles: string[]): CreateCharacterCommand {
    return new CreateCharacterCommand(
      dto.gameId,
      dto.faction,
      dto.name,
      dto.info,
      dto.statistics,
      dto.movement.strideCustomBonus,
      dto.endurance.customBonus,
      dto.maxHP,
      dto.skills,
      dto.items,
      userId,
      roles,
    );
  }
}
