import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { PaginationDto } from '../../../../shared/interfaces/http/dto/page.dto.js';
import { Game } from '../../../domain/aggregates/game.js';
import type { GamePhase } from '../../../domain/value-objects/game-phase.vo.js';
import type { GameStatus } from '../../../domain/value-objects/game-status.vo.js';
import { TacticalGameOutcomeDto } from './tactical-game-outcome.dto.js';
import { ActorDto } from './actor.dto.js';
import { GameEnvironmentDto } from './game-environment.dto.js';
import { EnvironmentFactionDto } from './environment-faction.dto.js';
import { GameSideDto } from './game-side.dto.js';
import { PSYCHOLOGY_RULES, type PsychologyRules } from '../../../domain/value-objects/game-side.vo.js';
import type { TacticalGameAccess } from '../../../domain/value-objects/strategic-member.vo.js';

export class GameDto {
  @ApiProperty({ description: 'Game identifier', example: 'lotr' })
  id: string;

  @ApiProperty({ type: Number, description: 'Version of optimistic concurrency: it goes up with each write', example: 0 })
  version: number;

  @ApiProperty({ description: 'Strategic Game identifier', example: 'lotr' })
  strategicGameId: string;

  @ApiProperty({ description: 'Name of the game', example: 'Mordor Game 1' })
  name: string;

  @ApiProperty({ type: String, description: 'Current status of the game' })
  @IsString()
  status: GameStatus;

  @ApiProperty({ description: 'Current round of the game', example: 1 })
  @IsNotEmpty()
  round: number;

  @ApiProperty({ type: String, description: 'Current phase of the game' })
  @IsString()
  phase: GamePhase;

  @ApiProperty({
    description: 'Factions involved in the game',
    type: [String],
    example: ['faction-001', 'faction-002'],
  })
  factions: string[];

  @ApiProperty({
    type: [GameSideDto],
    description: 'Workspace spec 100: the sides of the game; without sides defined, one per faction (id = faction id, name null)',
  })
  sides: GameSideDto[];

  @ApiProperty({ description: 'Workspace spec 100: the game master defined the sides (false: one side per faction)' })
  sidesDefined: boolean;

  @ApiProperty({
    type: String,
    enum: PSYCHOLOGY_RULES,
    description: 'Workspace spec 100: fear alerts of the upkeep by heads (book) or by levels (house)',
  })
  psychologyRules: PsychologyRules;

  @ApiProperty({ description: 'Actors involved in the game', type: [ActorDto] })
  actors: ActorDto[];

  @ApiProperty({ description: 'Environment configuration for the game', required: false })
  environment: GameEnvironmentDto | undefined;

  @ApiProperty({
    description: 'The environment faction (spec 055): the NPCs of no player, owned by the game master',
    type: EnvironmentFactionDto,
    nullable: true,
  })
  environmentFaction: EnvironmentFactionDto | null;

  @ApiProperty({
    type: Object,
    description:
      'Fear triggers already alerted (spec 068): by side `side:<sideId>` and by actor `actor:<actorId>` since spec 100; ' +
      'older games keep keys by faction id',
  })
  fearThresholdsAlerted: Record<string, string[]>;

  @ApiProperty({ type: String, description: 'Description of the game', required: false, example: 'Tactical battle in Mordor' })
  description: string | undefined;

  @ApiProperty({ type: String, description: 'Image URL for the game', required: false, example: 'https://example.com/image.png' })
  imageUrl: string | undefined;

  @ApiProperty({ description: 'Owner of the game', example: 'user-123' })
  owner: string;

  @ApiProperty({
    type: String,
    description: 'Owner of the strategic game, who also manages this game (spec 021); missing in games not migrated yet',
    required: false,
    example: 'user-456',
  })
  strategicGameOwner?: string;

  @ApiProperty({ type: String, description: 'accessType of the strategic game: who reads this game (spec 021)', example: 'private' })
  accessType: string;

  @ApiProperty({
    type: String,
    enum: ['read', 'act', 'manage'],
    description:
      'Workspace spec 072: what the caller does with the game. manage: change, play and delete it; act: act for some of its ' +
      'actors (owner or faction player); read: only read it',
    example: 'read',
  })
  access: TacticalGameAccess;

  @ApiProperty({ description: 'Outcome of a finished game (spec 013)', type: () => TacticalGameOutcomeDto, required: false })
  outcome?: TacticalGameOutcomeDto;

  /** The members and faction players of the game stay out: only the `access` of the caller goes (spec 072). */
  static fromEntity(entity: Game, access: TacticalGameAccess) {
    const dto = new GameDto();
    dto.id = entity.id;
    dto.version = entity.version;
    dto.strategicGameId = entity.strategicGameId;
    dto.name = entity.name;
    dto.status = entity.status;
    dto.phase = entity.phase;
    dto.round = entity.round;
    dto.factions = entity.factions;
    dto.sides = entity.effectiveSides().map(side => GameSideDto.fromEntity(side));
    dto.sidesDefined = entity.sidesDefined();
    dto.psychologyRules = entity.psychologyRulesOrDefault();
    dto.actors = entity.actors.map(actor => ActorDto.fromEntity(actor));
    dto.environment = entity.environment ? GameEnvironmentDto.fromEntity(entity.environment) : undefined;
    dto.environmentFaction = entity.environmentFaction ? EnvironmentFactionDto.fromEntity(entity.environmentFaction) : null;
    dto.fearThresholdsAlerted = entity.fearThresholdsAlerted ?? {};
    dto.description = entity.description;
    dto.imageUrl = entity.imageUrl;
    dto.owner = entity.owner;
    dto.strategicGameOwner = entity.strategicGameOwner;
    dto.accessType = entity.accessType;
    dto.access = access;
    dto.outcome = entity.outcome ? TacticalGameOutcomeDto.fromEntity(entity.outcome) : undefined;
    return dto;
  }
}

export class GamePageDto {
  constructor(content: GameDto[] = [], pagination: PaginationDto = new PaginationDto()) {
    this.content = content;
    this.pagination = pagination;
  }

  @ApiProperty({
    type: [GameDto],
    description: 'Games',
  })
  content: GameDto[];
  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
