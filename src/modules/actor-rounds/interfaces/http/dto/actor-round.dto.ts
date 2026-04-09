import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../../../shared/interfaces/http/dto';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import { ActorRoundEffect } from '../../../domain/value-objets/actor-round-effect.vo';
import { ActorRoundAlertDto } from './actor-round-alert.dto';
import { ActorRoundAttackDto } from './actor-round-attack.dto';
import { ActorRoundDefenseDto } from './actor-round-defense.dto';
import { ActorRoundFatigueDto } from './actor-round-fatigue.dto';
import { ActorRoundHPDto } from './actor-round-hp.dto';
import { ActorRoundInitiativeDto } from './actor-round-initiative.dto';
import { ActorRoundParryDto } from './actor-round-parry.dto';
import { ActorRoundPenaltyDto } from './actor-round-penalty.dto';

export class ActorRoundDto {
  @ApiProperty({ description: 'Actor Round identifier', example: 'actor-round-123' })
  id: string;

  @ApiProperty({ description: 'Game identifier', example: 'game-001' })
  gameId: string;

  @ApiProperty({ description: 'Actor identifier', example: 'actor-001' })
  actorId: string;

  @ApiProperty({ description: 'Actor name', example: 'Goblin Warrior' })
  actorName: string;

  @ApiProperty({ description: 'Race identifier', example: 'race-goblin', required: false })
  raceName?: string;

  @ApiProperty({ description: 'Actor level', example: 1, required: false })
  level?: number;

  @ApiProperty({ description: 'Faction', required: true })
  factionId: string;

  @ApiProperty({ description: 'Round number', example: 1 })
  round: number;

  @ApiProperty({ description: 'Initiative information' })
  initiative: ActorRoundInitiativeDto;

  @ApiProperty({ description: 'Action points', example: 4 })
  actionPoints: number;

  @ApiProperty({ description: 'Hit points' })
  hp: ActorRoundHPDto;

  @ApiProperty({ description: 'Fatigue points' })
  fatigue: ActorRoundFatigueDto;

  @ApiProperty({ description: 'Defense information' })
  defense: ActorRoundDefenseDto;

  @ApiProperty({ description: 'Attacks', type: [ActorRoundAttackDto], isArray: true })
  attacks: ActorRoundAttackDto[];

  @ApiProperty({ description: 'Parries', type: [ActorRoundParryDto], isArray: true })
  parries: number[];

  @ApiProperty({ description: 'Penalties' })
  penalty: ActorRoundPenaltyDto;

  @ApiProperty({ description: 'Active effects', type: [ActorRoundEffect], isArray: true })
  effects: ActorRoundEffect[];

  @ApiProperty({ description: 'Alerts', type: [ActorRoundAlertDto], isArray: true })
  alerts: ActorRoundAlertDto[];

  @ApiProperty({ description: 'Image URL of the actor', example: 'foo/bar/image.png', required: false })
  imageUrl?: string | undefined;

  static fromEntity(entity: ActorRound) {
    const dto = new ActorRoundDto();
    dto.id = entity.id;
    dto.gameId = entity.gameId;
    dto.actorId = entity.actorId;
    dto.actorName = entity.actorName;
    dto.raceName = entity.raceName;
    dto.level = entity.level;
    dto.factionId = entity.factionId;
    dto.round = entity.round;
    dto.initiative = ActorRoundInitiativeDto.fromEntity(entity.initiative);
    dto.actionPoints = entity.actionPoints;
    dto.hp = ActorRoundHPDto.fromEntity(entity.hp);
    dto.fatigue = ActorRoundFatigueDto.fromEntity(entity.fatigue);
    dto.defense = ActorRoundDefenseDto.fromEntity(entity.defense);
    dto.attacks = entity.attacks.map((a) => ActorRoundAttackDto.fromEntity(a));
    dto.parries = entity.parries;
    dto.penalty = ActorRoundPenaltyDto.fromEntity(entity.penalty);
    dto.effects = entity.effects;
    dto.alerts = entity.alerts.map((a) => ActorRoundAlertDto.fromEntity(a));
    dto.imageUrl = entity.imageUrl;
    return dto;
  }
}

export class CharacterRoundPageDto {
  constructor(content: ActorRoundDto[], pagination: PaginationDto) {
    this.content = content;
    this.pagination = pagination;
  }

  @ApiProperty({ type: [ActorRoundDto], description: 'Character Rounds', isArray: true })
  content: ActorRoundDto[];

  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
