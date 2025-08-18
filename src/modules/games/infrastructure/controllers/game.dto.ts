import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsString } from 'class-validator';
import { PaginationDto } from '../../../shared/infrastructure/controller/dto';
import { CreateGameCommand } from '../../application/commands/create-game.command';
import { UpdateGameCommand } from '../../application/commands/update-game.command';
import { Game } from '../../domain/entities/game.entity';

export class GameDto {
  @ApiProperty({ description: 'Game identifier', example: 'lotr' })
  id: string;

  @ApiProperty({ description: 'Name of the game', example: 'Mordor Game 1' })
  name: string;

  @ApiProperty({ description: 'Factions involved in the game', type: [String], example: ['Gondor', 'Mordor'] })
  @IsString({ each: true })
  factions: string[];

  @ApiProperty({ description: 'Current status of the game', enum: ['created', 'in_progress', 'finished'] })
  @IsString()
  status: 'created' | 'in_progress' | 'finished';

  @ApiProperty({ description: 'Current round of the game', example: 1 })
  @IsNotEmpty()
  round: number;

  @ApiProperty({
    description: 'Current phase of the game',
    enum: ['not_started', 'declare_actions', 'declare_initative', 'resolve_actions', 'upkeep'],
  })
  @IsString()
  phase: 'not_started' | 'declare_actions' | 'declare_initative' | 'resolve_actions' | 'upkeep';

  @ApiProperty({ description: 'Description of the game', required: false, example: 'Tactical battle in Mordor' })
  description: string | undefined;

  static fromEntity(entity: Game) {
    const dto = new GameDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.status = entity.status;
    dto.phase = entity.phase;
    dto.factions = entity.factions;
    dto.round = entity.round;
    return dto;
  }
}

export class CreateGameDto {
  @ApiProperty({ description: 'Name of the game', example: 'Mordor Game 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Description of the game', required: false, example: 'Tactical battle in Mordor' })
  @IsString()
  description: string | undefined;

  @ApiProperty({ description: 'Factions involved in the game', type: [String], example: ['Gondor', 'Mordor'] })
  @IsString({ each: true })
  factions: string[] | undefined;

  static toCommand(dto: CreateGameDto, userId: string, roles: string[]) {
    return new CreateGameCommand(dto.name, dto.description, dto.factions, userId, roles);
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
