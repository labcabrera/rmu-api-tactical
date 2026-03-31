import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateGameCommand, CreateGameCommandActor } from '../../../application/cqrs/commands/create-game.command';
import type { ActorType } from '../../../domain/value-objects/actor-type.vo';

export class CreateGameActorDto {
  constructor(id: string, type: ActorType, faction: string | undefined) {
    this.id = id;
    this.type = type;
    this.faction = faction;
  }

  @ApiProperty({ description: 'Actor identifier (character or NPC id)', example: 'actor-123' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Actor type', example: 'character' })
  @IsString()
  @IsNotEmpty()
  type: ActorType;

  @ApiProperty({ description: 'Faction. Only for NPCs. For characters faction are not required', example: 'neutral' })
  @IsString()
  @IsOptional()
  faction: string | undefined;

  static toCommand(dto: CreateGameActorDto): CreateGameCommandActor {
    return new CreateGameCommandActor(dto.id, dto.type, dto.faction);
  }
}

export class CreateGameEnvironmentDto {
  @ApiProperty({ description: 'Temperature fatigue modifier', required: false, example: -5 })
  @IsNumber()
  @IsOptional()
  temperatureFatigueModifier: number | undefined;

  @ApiProperty({ description: 'Altitude fatigue modifier', required: false, example: -10 })
  @IsNumber()
  @IsOptional()
  altitudeFatigueModifier: number | undefined;
}

export class CreateGameDto {
  constructor(
    strategicGameId: string,
    name: string,
    factions: string[],
    actors: CreateGameActorDto[] = [],
    environment: CreateGameEnvironmentDto | undefined,
    description: string | undefined,
  ) {
    this.strategicGameId = strategicGameId;
    this.name = name;
    this.factions = factions;
    this.actors = actors;
    this.environment = environment;
    this.description = description;
  }

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

  @ApiProperty({
    description: 'Environment configuration for the game',
    required: false,
    type: CreateGameEnvironmentDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateGameEnvironmentDto)
  environment: CreateGameEnvironmentDto | undefined;

  @ApiProperty({ description: 'Description of the game', required: false, example: 'Tactical battle in Mordor' })
  @IsString()
  description: string | undefined;

  @ApiProperty({ description: 'Image URL for the game', required: false, example: 'https://example.com/image.png' })
  @IsString()
  @IsOptional()
  imageUrl: string | undefined;

  static toCommand(dto: CreateGameDto, userId: string, roles: string[]) {
    const actors: CreateGameCommandActor[] | undefined = dto.actors
      ? dto.actors.map((actor) => new CreateGameCommandActor(actor.id, actor.type, actor.faction))
      : [];
    const environment = dto.environment
      ? {
          temperatureFatigueModifier: dto.environment.temperatureFatigueModifier,
          altitudeFatigueModifier: dto.environment.altitudeFatigueModifier,
        }
      : undefined;
    return new CreateGameCommand(
      dto.strategicGameId,
      dto.name,
      dto.factions,
      actors,
      environment,
      dto.description,
      dto.imageUrl,
      userId,
      roles,
    );
  }
}
