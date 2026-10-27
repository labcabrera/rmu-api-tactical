import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';
import type { InjurySource } from '../../../domain/value-objects/injury.vo.js';
import {
  ANTIDOTE_SOURCES,
  ANY_POISON,
  type AntidoteSource,
  type InjuryPoison,
  POISON_CATEGORIES,
  POISON_FORMS,
  POISON_SEVERITIES,
  type PoisonAntidote,
  type PoisonCategory,
  type PoisonData,
  type PoisonExposure,
  type PoisonForm,
  type PoisonRr,
  type PoisonSeverity,
  type PoisonStage,
} from '../../../domain/value-objects/poison.vo.js';

export class PoisonRangeDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  min: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  max: number;
}

/** A poison: from the catalog (the client copies its `features.poison`) or described by the game master. */
export class PoisonDataDto implements PoisonData {
  @ApiProperty({ required: false, description: 'Catalog item of the poison' })
  @IsOptional()
  @IsString()
  itemTypeId?: string;

  @ApiProperty({ example: 'Sleeping draught' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ type: String, enum: POISON_CATEGORIES })
  @IsIn(POISON_CATEGORIES)
  category: PoisonCategory;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  level: number;

  @ApiProperty({ type: String, enum: POISON_FORMS, required: false })
  @IsOptional()
  @IsIn(POISON_FORMS)
  form?: PoisonForm;

  @ApiProperty({ type: String, enum: POISON_SEVERITIES, required: false, nullable: true })
  @IsOptional()
  @IsIn(POISON_SEVERITIES)
  maxSeverity?: PoisonSeverity | null;

  @ApiProperty({ type: PoisonRangeDto, required: false, nullable: true, description: 'Hits taken when the RR fails' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PoisonRangeDto)
  immediateHits?: PoisonRangeDto | null;

  @ApiProperty({ type: PoisonRangeDto, required: false, nullable: true, description: 'Onset of the mild stage, in rounds' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PoisonRangeDto)
  onsetRounds?: PoisonRangeDto | null;
}

export class PoisonRrModifierDto {
  @ApiProperty({ example: 'half-dose' })
  @IsString()
  key: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  value: number;
}

/** `POST /v1/actor-rounds/:id/poisonings`. */
export class CreatePoisoningDto {
  @ApiProperty({ type: PoisonDataDto })
  @ValidateNested()
  @Type(() => PoisonDataDto)
  poison: PoisonDataDto;
}

/** `POST /v1/actor-rounds/:id/poisonings/:exposureId/resolve`. */
export class ResolvePoisoningDto {
  @ApiProperty({ required: false, description: 'Open-ended roll; missing, the server rolls it' })
  @IsOptional()
  @IsNumber()
  roll?: number;

  @ApiProperty({ required: false, description: 'Poison RR bonus, for an actor without one in its sheet (NPCs)' })
  @IsOptional()
  @IsNumber()
  bonus?: number;

  @ApiProperty({ type: [PoisonRrModifierDto], required: false, description: 'Modifiers of the game master (dose, size...)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PoisonRrModifierDto)
  modifiers?: PoisonRrModifierDto[];
}

/** `POST /v1/actor-rounds/:id/injuries/:injuryId/antidote`. */
export class GiveAntidoteDto {
  @ApiProperty({ type: String, enum: ANTIDOTE_SOURCES, description: 'item of the catalog, external (not tracked) or magic' })
  @IsIn(ANTIDOTE_SOURCES)
  source: AntidoteSource;

  @ApiProperty({ example: 'Herbal antidote' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  itemTypeId?: string;

  @ApiProperty({ type: [String], required: false, description: `Poison categories it cures, or ${ANY_POISON}` })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn([...POISON_CATEGORIES, ANY_POISON], { each: true })
  categories?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  level?: number;

  @ApiProperty({ required: false, nullable: true, description: 'Hours after the exposure it still works' })
  @IsOptional()
  @IsNumber()
  withinHours?: number | null;
}

export class PoisonStageDto implements PoisonStage {
  @ApiProperty({ type: String, enum: POISON_SEVERITIES })
  severity: PoisonSeverity;

  @ApiProperty({ description: 'Rounds from the exposure' })
  startsAt: number;

  @ApiProperty({ type: Number, nullable: true, description: 'Rounds from the exposure; null until cured' })
  endsAt: number | null;

  @ApiProperty()
  penalty: number;

  @ApiProperty()
  hitsPerRound: number;

  @ApiProperty({ type: Number, nullable: true })
  hitsUntil: number | null;

  @ApiProperty({ type: String, nullable: true, enum: ['unconscious', 'coma', 'paralyzed', 'incapacitated', 'dead'] })
  condition: PoisonStage['condition'];

  @ApiProperty({ type: Number, nullable: true })
  conditionAt: number | null;

  @ApiProperty({ type: Number, nullable: true })
  conditionUntil: number | null;

  @ApiProperty()
  permanent: boolean;

  @ApiProperty()
  started: boolean;

  @ApiProperty()
  ended: boolean;

  @ApiProperty({ required: false })
  conditionApplied?: boolean;
}

export class InjuryPoisonDto implements InjuryPoison {
  @ApiProperty({ required: false })
  itemTypeId?: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: String, enum: POISON_CATEGORIES })
  category: PoisonCategory;

  @ApiProperty()
  level: number;

  @ApiProperty({ type: String, enum: POISON_FORMS, required: false })
  form?: PoisonForm;

  @ApiProperty({ type: Object, description: 'roll, bonus, total and failure of the RR' })
  rr: PoisonRr;

  @ApiProperty({ type: String, enum: POISON_SEVERITIES })
  severity: PoisonSeverity;

  @ApiProperty({ type: [PoisonStageDto] })
  stages: PoisonStageDto[];

  @ApiProperty({ description: 'Rounds since the exposure' })
  elapsedRounds: number;

  @ApiProperty()
  exposedAt: string;

  @ApiProperty({ required: false })
  neutralized?: boolean;

  @ApiProperty({ required: false })
  finished?: boolean;

  @ApiProperty({ type: [Object], required: false })
  antidotes?: PoisonAntidote[];

  static fromEntity(entity: InjuryPoison): InjuryPoisonDto {
    return Object.assign(new InjuryPoisonDto(), structuredClone(entity));
  }
}

export class PoisonExposureDto implements PoisonExposure {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: PoisonDataDto })
  poison: PoisonData;

  @ApiProperty({ type: Object })
  source: InjurySource;

  @ApiProperty()
  createdAt: string;

  static fromEntity(entity: PoisonExposure): PoisonExposureDto {
    return Object.assign(new PoisonExposureDto(), structuredClone(entity));
  }
}
