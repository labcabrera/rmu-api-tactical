import { ApiProperty } from '@nestjs/swagger';

import { PaginationDto } from '../../../../shared/infrastructure/controller/dto';
import { UpdateCharacterCommand } from '../../../application/commands/update-character.command';
import * as characterEntity from '../../../domain/entities/character.entity';
import { CharacterHP } from '../../persistence/models/character.model-childs';
import { CharacterEnduranceDto } from './character-endurance.dto';
import { CharacterMovementDto } from './character-movement-dto';
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

  endurance: CharacterEnduranceDto;

  static fromEntity(entity: characterEntity.Character) {
    const dto = new CharacterDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.faction = entity.faction;
    dto.info = entity.info;
    dto.statistics = CharacterStatisticsDto.fromEntity(entity.statistics);
    dto.movement = CharacterMovementDto.fromEntity(entity.movement);
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
