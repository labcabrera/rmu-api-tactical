import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../../../shared/interfaces/http/dto';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import { ActorRoundEffect } from '../../../domain/value-objets/actor-round-effect.vo';
import { ActorRoundAlertDto } from './actor-round-alert.dto';
import { ActorRoundAttackDto } from './actor-round-attack.dto';
import { ActorRoundDefenseDto } from './actor-round-defense.dto';
import { ActorRoundFactionDto } from './actor-round-faction.dto';
import { ActorRoundFatigueDto } from './actor-round-fatigue.dto';
import { ActorRoundHPDto } from './actor-round-hp.dto';
import { ActorRoundInitiativeDto } from './actor-round-initiative.dto';
import { ActorRoundParryDto } from './actor-round-parry.dto';
import { ActorRoundPenaltyDto } from './actor-round-penalty.dto';

export class ActorRoundDto {
  constructor(
    id: string,
    gameId: string,
    actorId: string,
    actorName: string,
    raceName: string | undefined,
    level: number | undefined,
    faction: ActorRoundFactionDto | undefined,
    round: number,
    initiative: ActorRoundInitiativeDto,
    actionPoints: number,
    hp: ActorRoundHPDto,
    fatigue: ActorRoundFatigueDto,
    defense: ActorRoundDefenseDto,
    attacks: ActorRoundAttackDto[],
    parries: number[],
    penalty: ActorRoundPenaltyDto,
    effects: ActorRoundEffect[],
    alerts: ActorRoundAlertDto[],
    imageUrl: string | undefined,
  ) {
    this.id = id;
    this.gameId = gameId;
    this.actorId = actorId;
    this.actorName = actorName;
    this.raceName = raceName;
    this.level = level;
    this.faction = faction;
    this.round = round;
    this.initiative = initiative;
    this.actionPoints = actionPoints;
    this.hp = hp;
    this.fatigue = fatigue;
    this.defense = defense;
    this.attacks = attacks;
    this.parries = parries;
    this.penalty = penalty;
    this.effects = effects;
    this.alerts = alerts;
    this.imageUrl = imageUrl;
  }

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

  @ApiProperty({ description: 'Faction', required: false })
  faction?: ActorRoundFactionDto;

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
    return new ActorRoundDto(
      entity.id,
      entity.gameId,
      entity.actorId,
      entity.actorName,
      entity.raceName,
      entity.level,
      entity.faction ? ActorRoundFactionDto.fromEntity(entity.faction) : undefined,
      entity.round,
      ActorRoundInitiativeDto.fromEntity(entity.initiative),
      entity.actionPoints,
      ActorRoundHPDto.fromEntity(entity.hp),
      ActorRoundFatigueDto.fromEntity(entity.fatigue),
      ActorRoundDefenseDto.fromEntity(entity.defense),
      entity.attacks.map((a) => ActorRoundAttackDto.fromEntity(a)),
      entity.parries,
      ActorRoundPenaltyDto.fromEntity(entity.penalty),
      entity.effects,
      entity.alerts.map((a) => ActorRoundAlertDto.fromEntity(a)),
      entity.imageUrl,
    );
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
