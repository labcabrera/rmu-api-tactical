import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsObject, IsString, ValidateNested } from 'class-validator';

import { CreateCharacterCommand, CreateCharacterItem } from '../../../application/commands/create-character.command';
import { CharacterEnduranceCreationDto } from './character-endurance.dto';
import { CharacterHPCreationDto } from './character-hp.dto';
import { CharacterInfoDto } from './character-info.dto';
import { CharacterInitiativeCreationDto } from './character-initiative.dto';
import { CharacterItemCreationDto } from './character-item.dto';
import { CharacterMovementCreationDto } from './character-movement-dto';
import { CharacterSkillCreationDto } from './character-skill.dto';
import { CharacterStatisticsCreationDto } from './character-statistics.dto';

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

  @ApiProperty({ description: 'Character movement', type: CharacterStatisticsCreationDto })
  @ValidateNested()
  @Type(() => CharacterStatisticsCreationDto)
  @IsObject()
  statistics: CharacterStatisticsCreationDto;

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

  @ApiProperty({ description: 'Character HP', type: CharacterHPCreationDto })
  @ValidateNested()
  @Type(() => CharacterHPCreationDto)
  @IsObject()
  hp: CharacterHPCreationDto;

  @ApiProperty({ description: 'Character initiative', type: CharacterInitiativeCreationDto })
  @ValidateNested()
  @Type(() => CharacterInitiativeCreationDto)
  @IsObject()
  initiative: CharacterInitiativeCreationDto;

  @ApiProperty({ description: 'Character skills', type: [CharacterSkillCreationDto] })
  @ValidateNested({ each: true })
  @Type(() => CharacterSkillCreationDto)
  @IsArray()
  skills: CharacterSkillCreationDto[] | undefined;

  @ApiProperty({ description: 'Character items', type: [CharacterItemCreationDto] })
  @ValidateNested({ each: true })
  @Type(() => CharacterItemCreationDto)
  @IsArray()
  items: CharacterItemCreationDto[] | undefined;

  static toCommand(dto: CreateCharacterDto, userId: string, roles: string[]): CreateCharacterCommand {
    const skills = dto.skills!.map((skill) => ({
      skillId: skill.skillId,
      ranks: skill.ranks,
      customBonus: skill.customBonus,
      specialization: skill.specialization,
    }));
    const items: CreateCharacterItem[] = dto.items!.map((item) => ({
      name: item.name,
      itemTypeId: item.itemTypeId,
    }));
    return new CreateCharacterCommand(
      dto.gameId,
      dto.faction,
      dto.name,
      dto.info,
      dto.statistics.toEntity(),
      dto.movement.strideCustomBonus,
      dto.endurance.customBonus,
      dto.hp.customBonus,
      dto.initiative.customBonus,
      skills,
      items,
      userId,
      roles,
    );
  }
}
