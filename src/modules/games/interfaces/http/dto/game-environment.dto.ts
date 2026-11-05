import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional } from 'class-validator';
import { LIGHT_TYPES, type LightType } from '../../../../actions/domain/value-objects/light-type.vo.js';
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

  @ApiProperty({
    type: String,
    enum: LIGHT_TYPES,
    nullable: true,
    description: 'Ambient light (spec 076): default light of maneuvers and movements; left out keeps it, null clears it',
    required: false,
    example: 'dark',
  })
  @IsOptional()
  @IsIn([...LIGHT_TYPES, null])
  light?: LightType | null;

  static fromEntity(entity: GameEnvironment): GameEnvironmentDto {
    const dto = new GameEnvironmentDto();
    dto.temperatureFatigueModifier = entity.temperatureFatigueModifier;
    dto.altitudeFatigueModifier = entity.altitudeFatigueModifier;
    dto.light = entity.light ?? null;
    return dto;
  }
}
