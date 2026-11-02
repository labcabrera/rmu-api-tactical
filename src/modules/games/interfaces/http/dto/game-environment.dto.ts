import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';
import { GameEnvironment } from '../../../domain/value-objects/game-environment.vo.js';

export class GameEnvironmentDto {
  @ApiProperty({ type: Number, description: 'Temperature fatigue modifier', required: false, example: -10 })
  @IsNumber()
  @IsOptional()
  temperatureFatigueModifier?: number | undefined;

  @ApiProperty({ type: Number, description: 'Altitude fatigue modifier', required: false, example: -5 })
  @IsNumber()
  @IsOptional()
  altitudeFatigueModifier?: number | undefined;

  static fromEntity(entity: GameEnvironment): GameEnvironmentDto {
    const dto = new GameEnvironmentDto();
    dto.temperatureFatigueModifier = entity.temperatureFatigueModifier;
    dto.altitudeFatigueModifier = entity.altitudeFatigueModifier;
    return dto;
  }
}
