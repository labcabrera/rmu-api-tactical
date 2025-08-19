import { ApiProperty } from '@nestjs/swagger';

import { PaginationDto } from '../../../../shared/infrastructure/controller/dto';
import { UpdateCharacterCommand } from '../../../application/commands/update-character.command';
import * as characterEntity from '../../../domain/entities/character.entity';
import { CharacterHP } from '../../persistence/models/character.model-childs';
import { CharacterDefenseDto } from './character-defense.dto';
import { CharacterEnduranceDto } from './character-endurance.dto';
import { CharacterEquipmentDto } from './character-equipment.dto';
import { CharacterHPDto } from './character-hp.dto';
import { CharacterInitiativeDto } from './character-initiative.dto';
import { CharacterItemDto } from './character-item.dto';
import { CharacterMovementDto } from './character-movement-dto';
import { CharacterSkillDto } from './character-skill.dto';
import { CharacterStatisticsDto } from './character-statistics.dto';

export class CharacterDto {
  @ApiProperty({ description: 'Game identifier', example: 'lotr' })
  id: string;

  @ApiProperty({ description: 'Name of the game', example: 'Mordor Game 1' })
  name: string;

  @ApiProperty({ description: 'Faction of the character', example: 'Gondor' })
  faction: string;

  @ApiProperty({ description: 'Information about the character', type: Object })
  info: characterEntity.CharacterInfo;

  statistics: CharacterStatisticsDto;

  movement: CharacterMovementDto;

  defense: CharacterDefenseDto;

  endurance: CharacterEnduranceDto;

  hp: CharacterHPDto;

  inititiative: CharacterInitiativeDto;

  skills: CharacterSkillDto[];

  items: CharacterItemDto[];

  equipment: CharacterEquipmentDto;

  static fromEntity(entity: characterEntity.Character) {
    const dto = new CharacterDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.faction = entity.faction;
    dto.info = entity.info;
    dto.statistics = CharacterStatisticsDto.fromEntity(entity.statistics);
    dto.movement = CharacterMovementDto.fromEntity(entity.movement);
    dto.defense = CharacterDefenseDto.fromEntity(entity.defense);
    dto.endurance = CharacterEnduranceDto.fromEntity(entity.endurance);
    dto.hp = CharacterHPDto.fromEntity(entity.hp);
    dto.inititiative = CharacterInitiativeDto.fromEntity(entity.initiative);
    dto.skills = entity.skills.map((skill) => CharacterSkillDto.fromEntity(skill));
    dto.items = entity.items.map((item) => CharacterItemDto.fromEntity(item));
    dto.equipment = CharacterEquipmentDto.fromEntity(entity.equipment);
    return dto;
  }
}

export class UpdateCharacterDto {
  characterId: string;
  name: string | undefined;
  faction: string | undefined;
  info: Partial<characterEntity.CharacterInfo> | undefined;
  hp: Partial<CharacterHP> | undefined;
  static toCommand(id: string, dto: UpdateCharacterDto, userId: string, roles: string[]): UpdateCharacterCommand {
    return new UpdateCharacterCommand(dto.characterId, dto.name, dto.faction, dto.info, dto.hp, userId, roles);
  }
}

export class CharacterPageDto {
  @ApiProperty({ type: [CharacterDto], description: 'Characters', isArray: true })
  content: CharacterDto[];

  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
