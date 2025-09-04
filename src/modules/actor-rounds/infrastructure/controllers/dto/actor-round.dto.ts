import { ApiProperty } from '@nestjs/swagger';

import { PaginationDto } from '../../../../shared/infrastructure/controller/dto';
import { ActorRound } from '../../../domain/entities/actor-round.entity';
import { ActorRoundEffect } from '../../persistence/models/actor-round.models-childs';
import { ActorRoundHPDto } from './actor-round-hp.dto';
import { ActorRoundInitiativeDto } from './actor-round-initiative.dto';

export class ActorRoundDto {
  @ApiProperty({ description: 'Actor Round identifier' })
  id: string;

  @ApiProperty({ description: 'Game identifier' })
  gameId: string;

  @ApiProperty({ description: 'Actor identifier' })
  actorId: string;

  @ApiProperty({ description: 'Round number' })
  round: number;

  @ApiProperty({ description: 'Initiative information' })
  initiative: ActorRoundInitiativeDto;

  @ApiProperty({ description: 'Action points' })
  actionPoints: number;

  @ApiProperty({ description: 'Hit points' })
  hp: ActorRoundHPDto;

  @ApiProperty({ description: 'Active effects' })
  effects: ActorRoundEffect[];

  static fromEntity(entity: ActorRound) {
    const dto = new ActorRoundDto();
    dto.id = entity.id;
    dto.gameId = entity.gameId;
    dto.actorId = entity.actorId;
    dto.round = entity.round;
    dto.initiative = ActorRoundInitiativeDto.fromEntity(entity.initiative);
    dto.actionPoints = entity.actionPoints;
    dto.hp = ActorRoundHPDto.fromEntity(entity.hp);
    dto.effects = entity.effects;
    return dto;
  }
}

export class CharacterRoundPageDto {
  @ApiProperty({ type: [ActorRoundDto], description: 'Character Rounds', isArray: true })
  content: ActorRoundDto[];

  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
