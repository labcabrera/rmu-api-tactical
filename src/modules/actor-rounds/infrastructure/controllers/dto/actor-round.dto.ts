import { ApiProperty } from '@nestjs/swagger';

import { PaginationDto } from '../../../../shared/infrastructure/controller/dto';
import { ActorRound } from '../../../domain/entities/actor-round.entity';
import { ActorRoundEffect, ActorRoundHP, ActorRoundInitiative } from '../../persistence/models/actor-round.models-childs';

//TODO convert childs to dto
export class ActorRoundDto {
  id: string;
  gameId: string;
  actorId: string;
  round: number;
  initiative: ActorRoundInitiative;
  actionPoints: number;
  hp: ActorRoundHP;
  effects: ActorRoundEffect[];

  static fromEntity(entity: ActorRound) {
    const dto = new ActorRoundDto();
    dto.id = entity.id;
    dto.gameId = entity.gameId;
    dto.actorId = entity.actorId;
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
    type: [ActorRoundDto],
    description: 'Character Rounds',
    isArray: true,
  })
  content: ActorRoundDto[];
  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
