import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { PaginationDto } from '../../../../shared/interfaces/http/dto';
import { Game } from '../../../domain/aggregates/game.aggregate';
import type { GamePhase } from '../../../domain/value-objects/game-phase.vo';
import type { GameStatus } from '../../../domain/value-objects/game-status.vo';
import { ActorDto } from './actor.dto';
import { GameEnvironmentDto } from './game-environment.dto';

export class GameDto {
  @ApiProperty({ description: 'Game identifier', example: 'lotr' })
  id: string;

  @ApiProperty({ description: 'Strategic Game identifier', example: 'lotr' })
  strategicGameId: string;

  @ApiProperty({ description: 'Name of the game', example: 'Mordor Game 1' })
  name: string;

  @ApiProperty({ description: 'Current status of the game' })
  @IsString()
  status: GameStatus;

  @ApiProperty({ description: 'Current round of the game', example: 1 })
  @IsNotEmpty()
  round: number;

  @ApiProperty({ description: 'Current phase of the game' })
  @IsString()
  phase: GamePhase;

  @ApiProperty({
    description: 'Factions involved in the game',
    type: [String],
    example: ['faction-001', 'faction-002'],
  })
  factions: string[];

  @ApiProperty({ description: 'Actors involved in the game', type: [ActorDto] })
  actors: ActorDto[];

  @ApiProperty({ description: 'Environment configuration for the game', required: false })
  environment: GameEnvironmentDto | undefined;

  @ApiProperty({ description: 'Description of the game', required: false, example: 'Tactical battle in Mordor' })
  description: string | undefined;

  @ApiProperty({ description: 'Image URL for the game', required: false, example: 'https://example.com/image.png' })
  imageUrl: string | undefined;

  @ApiProperty({ description: 'Owner of the game', example: 'user-123' })
  owner: string;

  static fromEntity(entity: Game) {
    const dto = new GameDto();
    dto.id = entity.id;
    dto.strategicGameId = entity.strategicGameId;
    dto.name = entity.name;
    dto.status = entity.status;
    dto.phase = entity.phase;
    dto.round = entity.round;
    dto.factions = entity.factions;
    dto.actors = entity.actors.map(actor => ActorDto.fromEntity(actor));
    dto.environment = entity.environment ? GameEnvironmentDto.fromEntity(entity.environment) : undefined;
    dto.description = entity.description;
    dto.imageUrl = entity.imageUrl;
    dto.owner = entity.owner;
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
    isArray: true,
  })
  content: GameDto[];
  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
