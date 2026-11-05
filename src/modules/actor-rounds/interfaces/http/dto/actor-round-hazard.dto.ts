import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';
import { TEMPERATURE_KINDS, type TemperatureKind } from '../../../domain/services/environment-rules.js';
import { SIZE_IDS, type SizeId } from '../../../../shared/domain/size-scale.js';
import { ResolveHazardCommand } from '../../../application/cqrs/commands/resolve-hazard.command.js';
import {
  type ActorRoundHazard,
  HAZARD_KINDS,
  type HazardAttackTable,
  type HazardCritical,
  type HazardKind,
  type HazardTemperature,
} from '../../../domain/value-objects/actor-round-hazard.vo.js';

/** Whether the request is an attack (a fall or a falling object), which takes a distance and a roll. */
const isAttack = (dto: ResolveHazardDto) => dto.kind !== 'extreme-temperature';

/**
 * Workspace spec 077, decision D2: a fall or a falling object the game master resolves on the actor. Workspace spec 079,
 * C3: an extreme temperature, with its kind and its °C or a severity, and no distance or roll.
 */
export class ResolveHazardDto {
  @ApiProperty({ type: String, enum: HAZARD_KINDS, example: 'fall' })
  @IsIn(HAZARD_KINDS)
  kind: HazardKind;

  @ApiPropertyOptional({ description: 'Feet fallen (the actor or the object), more than 0; not for a temperature', example: 20 })
  @ValidateIf(isAttack)
  @IsNumber()
  distanceFeet: number;

  @ApiPropertyOptional({ description: 'Open-ended roll, upwards only and without fumble; not for a temperature', example: 71 })
  @ValidateIf(isAttack)
  @IsInt()
  @Min(1)
  roll: number;

  @ApiPropertyOptional({
    type: String,
    enum: TEMPERATURE_KINDS,
    nullable: true,
    description: 'Extreme temperature: cold (O), heat (H) or steam; by default the side of the temperature',
  })
  @IsOptional()
  @IsIn(TEMPERATURE_KINDS)
  temperatureKind?: TemperatureKind | null;

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Extreme temperature: °C (Table 15-3)', example: 180 })
  @IsOptional()
  @IsNumber()
  temperature?: number | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Extreme temperature: a severity (A-J) set by the game master instead of the temperature (contact)',
    example: 'C',
  })
  @IsOptional()
  @IsString()
  severity?: string | null;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Rolls (1-100) of the criticals, in order; the ones not given become critical alerts with origin hazard',
    example: [45],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(100, { each: true })
  criticalRolls?: number[] | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'DB of the actor. Fall: only magical DB, 0 by default. Falling object: the DB of the actor by default',
  })
  @IsOptional()
  @IsInt()
  db?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Pushed off the rampart' })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiPropertyOptional({ description: 'Fall: jumped on purpose, the height of the actor comes off the distance' })
  @IsOptional()
  @IsBoolean()
  deliberate?: boolean;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Fall: height of the actor in feet; by default the height of the actor round (NPCs: kept as their height)',
    example: 6,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  heightFeet?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'Fall: the fall-control maneuver of the actor (Acrobatics)' })
  @IsOptional()
  @IsString()
  fallControlActionId?: string | null;

  @ApiPropertyOptional({ type: String, enum: SIZE_IDS, nullable: true, description: 'Falling object: its size (Table 9-4a)' })
  @IsOptional()
  @IsIn(SIZE_IDS)
  objectSize?: SizeId | null;

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Falling object: its weight, gives its size without objectSize' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weightLbs?: number | null;

  @ApiPropertyOptional({ description: 'Falling object on the Rock table: the shield of the actor counts (true by default)' })
  @IsOptional()
  @IsBoolean()
  shield?: boolean;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'The knocked-back alert of the actor it resolves (spec 079): its severity caps the critical of the hazard',
  })
  @IsOptional()
  @IsString()
  knockedBackAlertId?: string | null;

  static toCommand(id: string, dto: ResolveHazardDto, userId: string, roles: string[]): ResolveHazardCommand {
    return new ResolveHazardCommand(
      id,
      {
        kind: dto.kind,
        distanceFeet: dto.distanceFeet ?? 0,
        roll: dto.roll ?? 0,
        criticalRolls: dto.criticalRolls ?? [],
        db: dto.db ?? null,
        note: dto.note ?? null,
        deliberate: dto.deliberate ?? false,
        heightFeet: dto.heightFeet ?? null,
        fallControlActionId: dto.fallControlActionId ?? null,
        objectSize: dto.objectSize ?? null,
        weightLbs: dto.weightLbs ?? null,
        shield: dto.shield ?? true,
        knockedBackAlertId: dto.knockedBackAlertId ?? null,
        temperatureKind: dto.temperatureKind ?? null,
        temperature: dto.temperature ?? null,
        severity: dto.severity ?? null,
      },
      userId,
      roles,
    );
  }
}

export class HazardCriticalDto implements HazardCritical {
  @ApiProperty({ example: 'I' })
  criticalType: string;

  @ApiProperty({ example: 'E' })
  criticalSeverity: string;

  @ApiProperty({ type: Number, nullable: true })
  roll: number | null;

  @ApiProperty({ type: Number, nullable: true })
  damage: number | null;

  @ApiProperty({ type: String, nullable: true })
  text: string | null;

  @ApiProperty({ type: String, nullable: true })
  location: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'The critical alert left when it was not rolled' })
  alertId: string | null;
}

export class HazardTemperatureDto implements HazardTemperature {
  @ApiProperty({ type: String, enum: TEMPERATURE_KINDS })
  kind: TemperatureKind;

  @ApiProperty({ type: Number, nullable: true, description: '°C given; null when the severity was given' })
  celsius: number | null;

  @ApiProperty({ example: 'O' })
  criticalType: string;

  @ApiProperty({ type: String, enum: ['table', 'given'] })
  severitySource: 'table' | 'given';
}

export class SeverityStepDto {
  @ApiProperty({ example: 'attack-size' })
  key: string;

  @ApiProperty({ example: 3 })
  value: number;
}

export class ActorRoundHazardDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: String, enum: HAZARD_KINDS })
  kind: HazardKind;

  @ApiProperty()
  round: number;

  @ApiProperty({ type: Number, nullable: true })
  phase: number | null;

  @ApiProperty()
  distanceFeet: number;

  @ApiProperty()
  deliberate: boolean;

  @ApiProperty({ type: Number, nullable: true })
  heightFeet: number | null;

  @ApiProperty({ type: String, nullable: true })
  fallControlActionId: string | null;

  @ApiProperty({ description: 'Severity steps of the fall control: +1, 0, -1 or -2' })
  fallControlSteps: number;

  @ApiProperty({ type: String, nullable: true })
  objectSize: string | null;

  @ApiProperty({ type: Number, nullable: true })
  weightLbs: number | null;

  @ApiProperty()
  shield: boolean;

  @ApiProperty({ type: String, enum: ['crush', 'rock'], nullable: true, description: 'Null for an extreme temperature' })
  attackTable: HazardAttackTable | null;

  @ApiProperty({ description: 'Steps from medium of the attack size' })
  attackSize: number;

  @ApiProperty()
  ob: number;

  @ApiProperty()
  db: number;

  @ApiProperty()
  roll: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  armor: number;

  @ApiProperty()
  text: string;

  @ApiProperty({ description: 'Damage of the table, before the Hit Multiplier' })
  baseDamage: number;

  @ApiProperty()
  multiplier: number;

  @ApiProperty({ description: 'Hits taken from the table' })
  damage: number;

  @ApiProperty({ type: String, nullable: true })
  originalSeverity: string | null;

  @ApiProperty({ type: String, nullable: true })
  severity: string | null;

  @ApiProperty({ type: [SeverityStepDto] })
  @Type(() => SeverityStepDto)
  severitySteps: SeverityStepDto[];

  @ApiProperty({ type: String, nullable: true, description: 'Most severe critical of a knock-back hazard (spec 079)' })
  severityCap: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'The knocked-back alert it resolved (spec 079)' })
  knockedBackAlertId: string | null;

  @ApiProperty({ type: [HazardCriticalDto] })
  criticals: HazardCriticalDto[];

  @ApiProperty({ type: HazardTemperatureDto, nullable: true, description: 'The extreme temperature of the hazard (spec 079, C3)' })
  temperature: HazardTemperatureDto | null;

  @ApiProperty({ type: String, nullable: true })
  note: string | null;

  @ApiProperty()
  createdAt: string;

  static fromEntity(hazard: ActorRoundHazard): ActorRoundHazardDto {
    return Object.assign(new ActorRoundHazardDto(), {
      ...hazard,
      severityCap: hazard.severityCap ?? null,
      knockedBackAlertId: hazard.knockedBackAlertId ?? null,
      temperature: hazard.temperature ? { ...hazard.temperature } : null,
      severitySteps: (hazard.severitySteps || []).map(step => ({ ...step })),
      criticals: (hazard.criticals || []).map(critical => ({ ...critical })),
    });
  }
}
