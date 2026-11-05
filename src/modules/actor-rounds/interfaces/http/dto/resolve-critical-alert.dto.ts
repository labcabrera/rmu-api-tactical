import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import type { CriticalAlertRoll } from '../../../domain/aggregates/actor-round.js';

/** Body of the roll of a critical alert (workspace spec 077, decision D3). */
export class ResolveCriticalAlertDto {
  @ApiProperty({ description: 'Critical roll, 1-100', example: 45 })
  @IsInt()
  @Min(1)
  @Max(100)
  roll: number;

  @ApiPropertyOptional({
    description: 'Critical table code (S, K, P...): required for the critical of a fumble, else the one of the alert',
    example: 'K',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z][\w-]*$/)
  criticalType?: string;
}

/** The critical rolled from an alert, in the answer (not stored). */
export class CriticalAlertRollDto implements CriticalAlertRoll {
  @ApiProperty()
  alertId: string;

  @ApiProperty({ type: String, nullable: true, description: 'fumble, hazard, or null (movement, percent maneuver, heat)' })
  origin: string | null;

  @ApiProperty({ example: 'K' })
  criticalType: string;

  @ApiProperty({ example: 'B' })
  criticalSeverity: string;

  @ApiProperty({ example: 45 })
  roll: number;

  @ApiProperty({ example: 'K-B-45' })
  criticalKey: string;

  @ApiProperty({ description: 'Hits of the critical' })
  damage: number;

  @ApiProperty()
  text: string;

  @ApiProperty({ type: String, nullable: true })
  location: string | null;

  static fromEntity(entity: CriticalAlertRoll): CriticalAlertRollDto {
    return Object.assign(new CriticalAlertRollDto(), entity);
  }
}
