import { ApiProperty } from '@nestjs/swagger';

import { PaginationDto } from '../../../../shared/infrastructure/controller/dto';
import { ActorRoundEffect } from '../../../domain/entities/actor-round-effect.vo';
import { ActorRound } from '../../../domain/entities/actor-round.aggregate';
import { ActorRoundAttackDto } from './actor-round-attack.dto';
import { ActorRoundFatigueDto } from './actor-round-fatigue.dto';
import { ActorRoundHPDto } from './actor-round-hp.dto';
import { ActorRoundInitiativeDto } from './actor-round-initiative.dto';
import { ActorRoundParryDto } from './actor-round-parry.dto';

export class ActorRoundDto {
  @ApiProperty({ description: 'Actor Round identifier' })
  id: string;

  @ApiProperty({ description: 'Game identifier' })
  gameId: string;

  @ApiProperty({ description: 'Actor identifier' })
  actorId: string;

  @ApiProperty({ description: 'Actor name' })
  actorName: string;

  @ApiProperty({ description: 'Round number' })
  round: number;

  @ApiProperty({ description: 'Initiative information' })
  initiative: ActorRoundInitiativeDto;

  @ApiProperty({ description: 'Action points' })
  actionPoints: number;

  @ApiProperty({ description: 'Hit points' })
  hp: ActorRoundHPDto;

  @ApiProperty({ description: 'Fatigue points' })
  fatigue: ActorRoundFatigueDto;

  @ApiProperty({ type: [ActorRoundAttackDto], description: 'Attacks', isArray: true })
  attacks: ActorRoundAttackDto[];

  @ApiProperty({ type: [ActorRoundParryDto], description: 'Parries', isArray: true })
  parries: ActorRoundParryDto[];

  @ApiProperty({ description: 'Active effects' })
  effects: ActorRoundEffect[];

  static fromEntity(entity: ActorRound) {
    const dto = new ActorRoundDto();
    dto.id = entity.id;
    dto.gameId = entity.gameId;
    dto.actorId = entity.actorId;
    dto.actorName = entity.actorName;
    dto.round = entity.round;
    dto.initiative = ActorRoundInitiativeDto.fromEntity(entity.initiative);
    dto.actionPoints = entity.actionPoints;
    dto.hp = ActorRoundHPDto.fromEntity(entity.hp);
    dto.attacks = entity.attacks.map((a) => ActorRoundAttackDto.fromEntity(a));
    dto.parries = entity.parries.map((p) => ActorRoundParryDto.fromEntity(p));
    dto.fatigue = ActorRoundFatigueDto.fromEntity(entity.fatigue);
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
