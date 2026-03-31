import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { UpdateGameCommand } from '../../../application/cqrs/commands/update-game.command';
import { GameEnvironment } from '../../../domain/value-objects/game-environment.vo';
import { GameEnvironmentDto } from './game-environment.dto';

export class UpdateGameDto {
  @ApiProperty({ description: 'Name of the game', example: 'Mordor Game 1' })
  @IsString()
  name: string | undefined;

  @ApiProperty({ description: 'Environment modifiers for the game', required: false })
  @IsOptional()
  environment?: GameEnvironmentDto;

  @ApiProperty({ description: 'Description of the game', example: 'Mordor Game 1 description' })
  @IsString()
  description: string | undefined;

  static toCommand(id: string, dto: UpdateGameDto, userId: string, roles: string[]) {
    const env = dto.environment
      ? new GameEnvironment(dto.environment.altitudeFatigueModifier, dto.environment.temperatureFatigueModifier)
      : undefined;
    return new UpdateGameCommand(id, dto.name, env, dto.description, userId, roles);
  }
}
