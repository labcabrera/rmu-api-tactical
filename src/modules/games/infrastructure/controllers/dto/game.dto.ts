import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsString } from 'class-validator';
import { PaginationDto } from '../../../../shared/infrastructure/controller/dto';
import { UpdateGameCommand } from '../../../application/commands/update-game.command';
import * as ge from '../../../domain/entities/game.entity';
import { ActorDto } from './actor-dto';

export class GameDto {
  @ApiProperty({ description: 'Game identifier', example: 'lotr' })
  id: string;

  @ApiProperty({ description: 'Strategic Game identifier', example: 'lotr' })
  strategicGameId: string;

  @ApiProperty({ description: 'Name of the game', example: 'Mordor Game 1' })
  name: string;

  @ApiProperty({ description: 'Current status of the game' })
  @IsString()
  status: ge.GameStatus;

  @ApiProperty({ description: 'Current round of the game', example: 1 })
  @IsNotEmpty()
  round: number;

  @ApiProperty({ description: 'Current phase of the game' })
  @IsString()
  phase: ge.GamePhase;

  @ApiProperty({ description: 'Factions involved in the game', type: [String], example: ['Gondor', 'Mordor'] })
  actors: ActorDto[];

  @ApiProperty({ description: 'Description of the game', required: false, example: 'Tactical battle in Mordor' })
  description: string | undefined;

  @ApiProperty({ description: 'Owner of the game', example: 'user-123' })
  owner: string;

  static fromEntity(entity: ge.Game) {
    const dto = new GameDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.status = entity.status;
    dto.phase = entity.phase;
    dto.round = entity.round;
    dto.actors = entity.actors.map((actor) => ActorDto.fromEntity(actor));
    dto.description = entity.description;
    dto.owner = entity.owner;
    return dto;
  }
}

export class UpdateGameDto {
  @ApiProperty({ description: 'Name of the game', example: 'Mordor Game 1' })
  @IsString()
  name: string | undefined;

  @ApiProperty({ description: 'Description of the game', example: 'Mordor Game 1 description' })
  @IsString()
  description: string | undefined;

  static toCommand(id: string, dto: UpdateGameDto, userId: string, roles: string[]) {
    return new UpdateGameCommand(id, dto.name, dto.description, userId, roles);
  }
}

export class GamePageDto {
  @ApiProperty({
    type: [GameDto],
    description: 'Games',
    isArray: true,
  })
  content: GameDto[];
  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
