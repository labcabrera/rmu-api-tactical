import { ActorRoundItemDto } from './actor-round-item.dto.js';
import { BreakageCheckResultDto } from './resolve-breakage-check.dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../../../shared/interfaces/http/dto/page.dto.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { ActorRoundEffect } from '../../../domain/value-objects/actor-round-effect.vo.js';
import { ActorRoundAlertDto } from './actor-round-alert.dto.js';
import { ActorRoundApLedgerEntryDto } from './actor-round-ap-ledger-entry.dto.js';
import { ActorRoundApModifierDto } from './actor-round-ap-modifier.dto.js';
import { ActorRoundAttackDto } from './actor-round-attack.dto.js';
import { ActorRoundDefenseModeDto } from './actor-round-defense-mode.dto.js';
import { ActorRoundDefenseDto } from './actor-round-defense.dto.js';
import { ActorRoundFatigueDto } from './actor-round-fatigue.dto.js';
import { ActorRoundHPDto } from './actor-round-hp.dto.js';
import { ActorRoundSnapshotDto, InjuryDto } from './actor-round-injury.dto.js';
import { ActorRoundInitiativeDto } from './actor-round-initiative.dto.js';
import { ActorRoundMovementDto } from './actor-round-movement.dto.js';
import { HpLogEntryDto } from './hp-log-entry.dto.js';
import { ActorRoundParryDto } from './actor-round-parry.dto.js';
import { ActorRoundPenaltyDto } from './actor-round-penalty.dto.js';
import { ActorRoundPhaseLogDto } from './actor-round-phase-log.dto.js';
import { ActorRoundTraitDto } from './actor-round-trait.dto.js';

export class ActorRoundDto {
  @ApiProperty({ description: 'Actor Round identifier', example: 'actor-round-123' })
  id: string;

  @ApiProperty({ type: Number, description: 'Version of optimistic concurrency: it goes up with each write', example: 0 })
  version: number;

  @ApiProperty({ description: 'Game identifier', example: 'game-001' })
  gameId: string;

  @ApiProperty({ description: 'Actor identifier', example: 'actor-001' })
  actorId: string;

  @ApiProperty({ description: 'Actor type', example: 'character' })
  actorType: string;

  @ApiProperty({ description: 'Actor name', example: 'Goblin Warrior' })
  actorName: string;

  @ApiProperty({ description: 'Actor size', example: 0, required: false })
  size: number;

  @ApiProperty({ description: 'Race identifier', example: 'race-goblin', required: false })
  raceName?: string;

  @ApiProperty({ description: 'Actor level', example: 1, required: false })
  level?: number;

  @ApiProperty({ description: 'Faction', required: true })
  factionId: string;

  @ApiProperty({ description: 'Round number', example: 1 })
  round: number;

  @ApiProperty({ description: 'Initiative information' })
  movement: ActorRoundMovementDto;

  @ApiProperty({ description: 'Initiative information' })
  initiative: ActorRoundInitiativeDto;

  @ApiProperty({ description: 'Base action points of the round, before modifiers', example: 4 })
  actionPoints: number;

  @ApiProperty({ description: 'Modifiers of the action points, with their origin', type: [ActorRoundApModifierDto], isArray: true })
  apModifiers: ActorRoundApModifierDto[];

  @ApiProperty({ description: 'Action points of each action phase (index 0 is phase 1)', type: [Number], example: [1, 1, 2, 2] })
  apCapacity: number[];

  @ApiProperty({ description: 'Action points spent, lost or used by phase and action', type: [ActorRoundApLedgerEntryDto], isArray: true })
  apLedger: ActorRoundApLedgerEntryDto[];

  @ApiProperty({ description: 'Hit points' })
  hp: ActorRoundHPDto;

  @ApiProperty({ description: 'Fatigue points' })
  fatigue: ActorRoundFatigueDto;

  @ApiProperty({ description: 'Defense information' })
  defense: ActorRoundDefenseDto;

  @ApiProperty({ description: 'Dodge and shield block declared this round', type: ActorRoundDefenseModeDto })
  defenseMode: ActorRoundDefenseModeDto;

  @ApiProperty({ description: 'Action points spent in each action phase that has ended', type: [ActorRoundPhaseLogDto], isArray: true })
  phaseLog: ActorRoundPhaseLogDto[];

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

  @ApiProperty({ description: 'Talents and flaws of the actor, from its character sheet', type: [ActorRoundTraitDto], isArray: true })
  traits: ActorRoundTraitDto[];

  @ApiProperty({ description: 'Injuries of the actor (spec 013): brought from its character and taken in the game', type: [InjuryDto] })
  injuries: InjuryDto[];

  @ApiProperty({ description: 'Changes of the hits in this round, with their origin (spec 013)', type: [HpLogEntryDto] })
  hpLog: HpLogEntryDto[];

  @ApiProperty({ description: 'Strategic character of a character actor', required: false })
  characterId?: string;

  @ApiProperty({ description: 'Items of the actor, with their breakage (spec 019)', type: [ActorRoundItemDto] })
  items: ActorRoundItemDto[];

  @ApiProperty({ description: 'Result of the breakage check of this request (only in its answer)', required: false })
  lastBreakageCheck?: BreakageCheckResultDto;

  @ApiProperty({ description: 'What the character brought into the game (only in the actor round built from it)', required: false })
  snapshot?: ActorRoundSnapshotDto;

  @ApiProperty({ description: 'Bleeding of the injuries, hits per round' })
  bleeding: number;

  @ApiProperty({ type: String, description: 'Image URL of the actor', example: 'foo/bar/image.png', required: false })
  imageUrl?: string | undefined;

  static fromEntity(entity: ActorRound) {
    const dto = new ActorRoundDto();
    dto.id = entity.id;
    dto.version = entity.version;
    dto.gameId = entity.gameId;
    dto.actorType = entity.actorType;
    dto.actorId = entity.actorId;
    dto.actorName = entity.actorName;
    dto.size = entity.size;
    dto.raceName = entity.raceName;
    dto.level = entity.level;
    dto.factionId = entity.factionId;
    dto.round = entity.round;
    dto.movement = ActorRoundMovementDto.fromEntity(entity.movement);
    dto.initiative = ActorRoundInitiativeDto.fromEntity(entity.initiative);
    dto.actionPoints = entity.actionPoints;
    dto.apModifiers = entity.apModifiers.map(modifier => ActorRoundApModifierDto.fromEntity(modifier));
    dto.apCapacity = [...entity.apCapacity];
    dto.apLedger = entity.apLedger.map(entry => ActorRoundApLedgerEntryDto.fromEntity(entry));
    dto.hp = ActorRoundHPDto.fromEntity(entity.hp);
    dto.fatigue = ActorRoundFatigueDto.fromEntity(entity.fatigue);
    dto.defense = ActorRoundDefenseDto.fromEntity(entity.defense);
    dto.defenseMode = ActorRoundDefenseModeDto.fromEntity(entity.defenseMode);
    dto.phaseLog = entity.getPhaseLog().map(entry => ActorRoundPhaseLogDto.fromEntity(entry));
    dto.attacks = entity.attacks.map(a => ActorRoundAttackDto.fromEntity(a));
    dto.parries = entity.parries;
    dto.penalty = ActorRoundPenaltyDto.fromEntity(entity.penalty);
    dto.effects = entity.effects;
    dto.alerts = entity.alerts.map(a => ActorRoundAlertDto.fromEntity(a));
    dto.traits = (entity.traits || []).map(t => ActorRoundTraitDto.fromEntity(t));
    dto.injuries = (entity.injuries || []).map(injury => InjuryDto.fromEntity(injury));
    dto.hpLog = (entity.hpLog || []).map(entry => HpLogEntryDto.fromEntity(entry));
    dto.characterId = entity.characterId;
    dto.items = (entity.items || []).map(item => ActorRoundItemDto.fromEntity(item));
    if (entity.lastBreakageCheck) dto.lastBreakageCheck = BreakageCheckResultDto.fromEntity(entity.lastBreakageCheck);
    dto.snapshot = entity.snapshot ? ActorRoundSnapshotDto.fromEntity(entity.snapshot) : undefined;
    dto.bleeding = entity.getBleeding();
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
