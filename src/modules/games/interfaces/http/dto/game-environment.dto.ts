import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { FOG_LEVELS, type FogLevel } from '../../../../actions/domain/value-objects/fog-level.vo.js';
import { LIGHT_TYPES, type LightType } from '../../../../actions/domain/value-objects/light-type.vo.js';
import { TEMPERATURE_KINDS, type TemperatureKind } from '../../../../actor-rounds/domain/services/environment-rules.js';
import { GameEnvironment, type GameExtremeTemperature } from '../../../domain/value-objects/game-environment.vo.js';

/** Workspace spec 079, C3 (§15.3): the extreme temperature of the game. */
export class GameExtremeTemperatureDto {
  @ApiProperty({ type: String, enum: TEMPERATURE_KINDS, description: 'cold (critical O), heat (H) or steam (steam)' })
  @IsIn(TEMPERATURE_KINDS)
  kind: TemperatureKind;

  @ApiPropertyOptional({ type: Number, nullable: true, description: '°C, converted with Table 15-3', example: -80 })
  @IsOptional()
  @IsNumber()
  temperature?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'A severity (A-J) instead of the temperature', example: 'B' })
  @IsOptional()
  @IsString()
  severity?: string | null;

  @ApiPropertyOptional({ description: 'Answers only: the critical table of the kind', example: 'O' })
  criticalType?: string;

  @ApiPropertyOptional({ description: 'Answers only: the severity of the critical of each round', example: 'B' })
  criticalSeverity?: string;

  static toEntity(dto: GameExtremeTemperatureDto | null | undefined): GameExtremeTemperature | null | undefined {
    if (dto === undefined || dto === null) return dto;
    return { kind: dto.kind, temperature: dto.temperature ?? null, severity: dto.severity ? dto.severity.toUpperCase() : null };
  }

  static fromEntity(entity: GameEnvironment): GameExtremeTemperatureDto | null {
    const extreme = entity.extremeTemperature;
    if (!extreme) return null;
    const dto = Object.assign(new GameExtremeTemperatureDto(), { ...extreme });
    try {
      const resolved = GameEnvironment.resolveTemperature(entity);
      if (resolved) Object.assign(dto, { criticalType: resolved.criticalType, criticalSeverity: resolved.severity });
    } catch {
      // A stored temperature that no longer gives a critical is shown as it is.
    }
    return dto;
  }
}

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

  @ApiPropertyOptional({
    type: String,
    enum: FOG_LEVELS,
    nullable: true,
    description: 'Fog (spec 079, C5, Table 15-7): modifier of the visual Perception and Tracking; left out keeps it, null clears it',
    example: 'heavy',
  })
  @IsOptional()
  @IsIn([...FOG_LEVELS, null])
  fog?: FogLevel | null;

  @ApiPropertyOptional({
    type: GameExtremeTemperatureDto,
    nullable: true,
    description:
      'Extreme temperature (spec 079, C3): a critical alert each upkeep for every actor not protected; left out keeps it, null clears it',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GameExtremeTemperatureDto)
  extremeTemperature?: GameExtremeTemperatureDto | null;

  static toEntity(dto: GameEnvironmentDto): GameEnvironment {
    return new GameEnvironment(
      dto.temperatureFatigueModifier,
      dto.altitudeFatigueModifier,
      dto.light,
      dto.fog,
      GameExtremeTemperatureDto.toEntity(dto.extremeTemperature),
    );
  }

  static fromEntity(entity: GameEnvironment): GameEnvironmentDto {
    const dto = new GameEnvironmentDto();
    dto.temperatureFatigueModifier = entity.temperatureFatigueModifier;
    dto.altitudeFatigueModifier = entity.altitudeFatigueModifier;
    dto.light = entity.light ?? null;
    dto.fog = entity.fog ?? null;
    dto.extremeTemperature = GameExtremeTemperatureDto.fromEntity(entity);
    return dto;
  }
}
