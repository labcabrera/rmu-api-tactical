import { ApiProperty } from '@nestjs/swagger';

import { PaginationDto } from '../../../../shared/infrastructure/controller/dto';
import { CharacterRound } from '../../../domain/entities/character-round.entity';
import { CharacterRoundEffect, CharacterRoundHP, CharacterRoundInitiative } from '../../persistence/models/character-round.models-childs';

//TODO convert childs to dto
export class CharacterRoundDto {
  id: string;
  gameId: string;
  characterId: string;
  round: number;
  initiative: CharacterRoundInitiative;
  actionPoints: number;
  hp: CharacterRoundHP;
  effects: CharacterRoundEffect[];

  static fromEntity(entity: CharacterRound) {
    const dto = new CharacterRoundDto();
    dto.id = entity.id;
    dto.gameId = entity.gameId;
    dto.characterId = entity.characterId;
    dto.round = entity.round;
    dto.initiative = entity.initiative;
    dto.actionPoints = entity.actionPoints;
    dto.hp = entity.hp;
    dto.effects = entity.effects;
    return dto;
  }
}

export class CharacterRoundPageDto {
  @ApiProperty({
    type: [CharacterRoundDto],
    description: 'Character Rounds',
    isArray: true,
  })
  content: CharacterRoundDto[];
  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
