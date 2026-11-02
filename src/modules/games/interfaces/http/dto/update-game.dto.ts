import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { UpdateGameCommand } from '../../../application/cqrs/commands/update-game.command.js';
import { GameEnvironment } from '../../../domain/value-objects/game-environment.vo.js';
import { GameEnvironmentDto } from './game-environment.dto.js';
import { UpdateEnvironmentFactionDto } from './environment-faction.dto.js';

export class UpdateGameDto {
  // Every field is optional: a PATCH changes what it sends (rmu-mfe-tactical sends only imageUrl) [F-tactical-12].
  @ApiPropertyOptional({ type: String, description: 'Name of the game', example: 'Mordor Game 1' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ type: GameEnvironmentDto, description: 'Environment modifiers for the game' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GameEnvironmentDto)
  environment?: GameEnvironmentDto;

  @ApiPropertyOptional({ type: String, description: 'Description of the game', example: 'Mordor Game 1 description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: String, description: 'Image URL for the game', required: false, example: 'https://example.com/image.png' })
  @IsString()
  @IsOptional()
  imageUrl: string | undefined;

  @ApiPropertyOptional({
    type: UpdateEnvironmentFactionDto,
    description: 'Renames the environment faction (spec 055), only in a created game',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateEnvironmentFactionDto)
  environmentFaction?: UpdateEnvironmentFactionDto;

  @ApiPropertyOptional({ description: 'Version the client read (from the GET); a different stored version is a 409', example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  version?: number;

  static toCommand(id: string, dto: UpdateGameDto, userId: string, roles: string[]) {
    const env = dto.environment
      ? new GameEnvironment(dto.environment.temperatureFatigueModifier, dto.environment.altitudeFatigueModifier)
      : undefined;
    return new UpdateGameCommand(
      id,
      dto.name,
      env,
      dto.description,
      dto.imageUrl,
      userId,
      roles,
      dto.version,
      dto.environmentFaction?.name,
    );
  }
}
