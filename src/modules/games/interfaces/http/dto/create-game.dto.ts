import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateGameCommand, CreateGameCommandActor } from '../../../application/cqrs/commands/create-game.command';
import * as ge from '../../../domain/entities/game.aggregate';

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

  static toCommand(dto: CreateGameActorDto): CreateGameCommandActor {
    return new CreateGameCommandActor(dto.id, dto.type, dto.faction);
  }
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

  @ApiProperty({ description: 'List of factions (characters or NPCs)', example: ['faction-001', 'faction-002'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  factions: string[];

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
    return new CreateGameCommand(dto.strategicGameId, dto.name, dto.factions, actors, dto.description, userId, roles);
  }
}
