import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

import { Type } from 'class-transformer';
import { CreateGameCommand, CreateGameCommandActor } from '../../../application/commands/create-game.command';
import * as ge from '../../../domain/entities/game.entity';

export class CreateGameActorDto {
  @ApiProperty({ description: 'Actor identifier (character or NPC id)', example: 'actor-123' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Actor type', example: 'character' })
  @IsString()
  @IsNotEmpty()
  type: ge.ActorType;

  @ApiProperty({ description: 'Faction. Only for NPCs. For characters faction are not required', example: 'neutral' })
  @IsString()
  @IsOptional()
  faction: string | undefined;
}

export class CreateGameDto {
  @ApiProperty({ description: 'Name of the game', example: 'strategic-game-452' })
  @IsString()
  @IsNotEmpty()
  strategicGameId: string;

  @ApiProperty({ description: 'Name of the game', example: 'Mordor Game 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'List of factions (characters or NPCs)', type: [CreateGameActorDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGameActorDto)
  actors: CreateGameActorDto[];

  @ApiProperty({ description: 'Description of the game', required: false, example: 'Tactical battle in Mordor' })
  @IsString()
  description: string | undefined;

  static toCommand(dto: CreateGameDto, userId: string, roles: string[]) {
    const actors: CreateGameCommandActor[] | undefined = dto.actors
      ? dto.actors.map((actor) => new CreateGameCommandActor(actor.id, actor.type, actor.faction))
      : [];
    return new CreateGameCommand(dto.strategicGameId, dto.name, actors, dto.description, userId, roles);
  }
}
