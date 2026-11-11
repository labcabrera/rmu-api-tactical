import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { SetGameSidesCommand } from '../../../application/cqrs/commands/set-game-sides.command.js';
import type { GameSide } from '../../../domain/value-objects/game-side.vo.js';

/**
 * A side of the game (workspace spec 100): factions that fight together. The id pattern, the name length and the
 * partition are checked by the domain, so they answer `err-sides-invalid`.
 */
export class GameSideDto {
  @ApiProperty({ description: 'Side id, `[A-Za-z0-9_-]`, 1 to 64 characters', example: 'fellowship' })
  @IsString()
  id: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Name of the side; null lets the front name it after its factions',
    example: 'Fellowship',
  })
  @IsOptional()
  @IsString()
  name: string | null;

  @ApiProperty({ type: [String], description: 'Factions of the side', example: ['faction-1', 'faction-2'] })
  @IsArray()
  @IsString({ each: true })
  factionIds: string[];

  @ApiProperty({ type: String, nullable: true, description: 'Actor of the side that leads it, or null', example: 'aragorn' })
  @IsOptional()
  @IsString()
  leaderActorId: string | null;

  static fromEntity(side: GameSide): GameSideDto {
    const dto = new GameSideDto();
    dto.id = side.id;
    dto.name = side.name ?? null;
    dto.factionIds = [...side.factionIds];
    dto.leaderActorId = side.leaderActorId ?? null;
    return dto;
  }

  static toEntity(dto: GameSideDto): GameSide {
    return { id: dto.id, name: dto.name ?? null, factionIds: dto.factionIds ?? [], leaderActorId: dto.leaderActorId ?? null };
  }
}

/** `PUT v1/tactical-games/:id/sides` (workspace spec 100): every side at once; an empty list goes back to one per faction. */
export class SetGameSidesDto {
  @ApiProperty({ type: [GameSideDto], description: 'Every side of the game: an exact partition of its factions' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GameSideDto)
  sides: GameSideDto[];

  @ApiPropertyOptional({ description: 'Version the client read (from the GET); a different stored version is a 409', example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  version?: number;

  static toCommand(gameId: string, dto: SetGameSidesDto, userId: string, roles: string[]): SetGameSidesCommand {
    return new SetGameSidesCommand(
      gameId,
      dto.sides.map(side => GameSideDto.toEntity(side)),
      userId,
      roles,
      dto.version,
    );
  }
}
