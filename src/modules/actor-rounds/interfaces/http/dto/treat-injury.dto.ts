import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import type { InjuryPatch } from '../../../domain/aggregates/actor-round.js';
import { TACTICAL_PROCEDURES } from '../../../domain/services/injury-treatment.js';
import type { TacticalProcedure } from '../../../domain/services/injury-treatment.js';
import {
  BLEEDING_CONTROLS,
  BODY_LOCATIONS,
  INJURY_FLAGS,
  INJURY_SEVERITIES,
  INJURY_STATUSES,
  INJURY_TYPES,
} from '../../../domain/value-objects/injury.vo.js';
import type {
  BleedingControl,
  BodyLocation,
  BodySide,
  InjuryFlag,
  InjurySeverity,
  InjuryStatus,
  InjuryType,
} from '../../../domain/value-objects/injury.vo.js';
import type { StabilizeEffectResult } from '../../../application/cqrs/handlers/stabilize-effect.handler.js';
import type { TreatInjuryResult } from '../../../application/cqrs/handlers/treat-injury.handler.js';
import { ActorRoundDto } from './actor-round.dto.js';
import { KeyValueModifierDto } from '../../../../actions/interfaces/http/dto/key-value-modifier.dto.js';

export class ExternalHealerDto {
  @ApiProperty({ description: 'Name of the healer' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Medicine bonus' })
  @IsNumber()
  bonus: number;
}

/** Healer and roll of a medical maneuver: an actor of the game or an external healer. */
export class MedicalRollDto {
  @ApiProperty({ description: 'Actor of the game that heals (the patient itself too)', required: false })
  @IsOptional()
  @IsString()
  healerActorId?: string;

  @ApiProperty({ description: 'External healer, when there is no healer actor', type: ExternalHealerDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExternalHealerDto)
  healer?: ExternalHealerDto;

  @ApiProperty({ description: 'Open-ended roll' })
  @IsNumber()
  roll: number;

  @ApiProperty({ description: 'Difficulty modifier; the procedure default when missing', required: false })
  @IsOptional()
  @IsNumber()
  difficulty?: number;
}

export class TreatInjuryDto extends MedicalRollDto {
  @ApiProperty({ type: String, enum: TACTICAL_PROCEDURES })
  @IsIn(TACTICAL_PROCEDURES)
  procedure: TacticalProcedure;

  @ApiProperty({ description: 'First roll of the open-ended one, when it is not `roll` (66: unusual event)', required: false })
  @IsOptional()
  @IsNumber()
  unmodifiedRoll?: number;

  @ApiProperty({ description: 'Cauterize: sum of the d10 of extra hits of the result; rolled by the server when missing', required: false })
  @IsOptional()
  @IsNumber()
  heatHitsRoll?: number;

  @ApiProperty({
    description: 'Cauterize: roll of the heat critical (1-100), resolved on the location of the injury; an alert when missing',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  heatCriticalRoll?: number;
}

/** What a cauterization did besides the bleeding (Table 13-1c). */
export class HeatResultDto {
  @ApiProperty({ description: 'Severity of the heat critical (A-D)' })
  critical: string;

  @ApiProperty({ description: 'Number of d10 of extra hits' })
  hitsDice: number;

  @ApiProperty({ description: 'Extra hits taken' })
  hits: number;

  @ApiProperty({ required: false, description: 'Roll of the heat critical, when it was resolved' })
  criticalRoll?: number;

  @ApiProperty({ required: false, description: 'Hits of the heat critical' })
  criticalDamage?: number;

  @ApiProperty({ required: false, description: 'Text of the critical table entry' })
  criticalText?: string;

  @ApiProperty({ required: false, description: 'Alert of the heat critical left for the game master' })
  alertId?: string;
}

export class UpdateInjuryDto implements InjuryPatch {
  @ApiProperty({ type: String, enum: INJURY_TYPES, required: false })
  @IsOptional()
  @IsIn(INJURY_TYPES)
  type?: InjuryType;

  @ApiProperty({ type: String, enum: INJURY_SEVERITIES, required: false })
  @IsOptional()
  @IsIn(INJURY_SEVERITIES)
  severity?: InjurySeverity;

  @ApiProperty({ type: String, enum: BODY_LOCATIONS, required: false })
  @IsOptional()
  @IsIn(BODY_LOCATIONS)
  location?: BodyLocation;

  @ApiProperty({ type: String, enum: ['left', 'right'], required: false })
  @IsOptional()
  @IsIn(['left', 'right'])
  side?: BodySide;

  @ApiProperty({ description: 'Current penalty (0 or negative)', required: false })
  @IsOptional()
  @IsNumber()
  penalty?: number;

  @ApiProperty({ description: 'Hits per round (0 stops it)', required: false })
  @IsOptional()
  @IsNumber()
  bleeding?: number;

  @ApiProperty({ type: String, enum: BLEEDING_CONTROLS, required: false })
  @IsOptional()
  @IsIn(BLEEDING_CONTROLS)
  bleedingControl?: BleedingControl;

  @ApiProperty({ enum: INJURY_FLAGS, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsIn(INJURY_FLAGS, { each: true })
  flags?: InjuryFlag[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: String, enum: INJURY_STATUSES, required: false })
  @IsOptional()
  @IsIn(INJURY_STATUSES)
  status?: InjuryStatus;
}

/** Result of a medical roll in a tactical game. */
export class MedicalResultDto {
  @ApiProperty({ type: ActorRoundDto })
  actorRound: ActorRoundDto;

  @ApiProperty({ enum: ['absolute-failure', 'failure', 'partial-success', 'success', 'absolute-success'] })
  result: string;

  @ApiProperty()
  roll: number;

  @ApiProperty({ description: 'Medicine bonus of the healer' })
  bonus: number;

  @ApiProperty({ description: 'Penalties of the healer actor (negative)' })
  healerPenalty: number;

  @ApiProperty()
  difficulty: number;

  @ApiProperty({ description: 'roll + bonus + difficulty + healer penalty' })
  total: number;

  @ApiProperty({ type: [KeyValueModifierDto], description: 'The total, entry by entry, with its rules (workspace spec 052)' })
  breakdown: KeyValueModifierDto[];

  @ApiProperty({ description: 'Message of the medical maneuver table', required: false })
  message?: string;

  @ApiProperty({ description: 'Modifier to the recovery roll' })
  recoveryModifier: number;

  @ApiProperty({ required: false, description: 'Treatment kept in the injury' })
  treatment?: object;

  @ApiProperty({ required: false, description: 'Severity of the heat critical to resolve (cauterize)' })
  heatCritical?: string;

  @ApiProperty({ required: false, type: HeatResultDto, description: 'Cauterize: extra hits and heat critical' })
  heat?: HeatResultDto;

  @ApiProperty({ required: false, description: 'Cauterize: unmodified 66, the patient catches fire (game master)' })
  unusualEvent?: boolean;

  @ApiProperty({ required: false, description: 'Rounds the dying effect gained (stabilize)' })
  roundsGained?: number;

  static fromTreatment(result: TreatInjuryResult): MedicalResultDto {
    const dto = MedicalResultDto.base(result.actorRound, result.roll);
    dto.treatment = result.treatment;
    dto.heatCritical = result.heatCritical;
    dto.heat = result.heat;
    dto.unusualEvent = result.unusualEvent;
    dto.recoveryModifier = result.treatment.recoveryModifier;
    return dto;
  }

  static fromStabilize(result: StabilizeEffectResult): MedicalResultDto {
    const dto = MedicalResultDto.base(result.actorRound, result.roll);
    dto.roundsGained = result.roundsGained;
    return dto;
  }

  private static base(actorRound: TreatInjuryResult['actorRound'], roll: TreatInjuryResult['roll']): MedicalResultDto {
    const dto = new MedicalResultDto();
    dto.actorRound = ActorRoundDto.fromEntity(actorRound);
    dto.result = roll.outcome.result;
    dto.roll = roll.roll;
    dto.bonus = roll.healer.bonus;
    dto.healerPenalty = roll.healerPenalty;
    dto.difficulty = roll.difficulty;
    dto.total = roll.total;
    dto.breakdown = roll.breakdown.map(modifier => KeyValueModifierDto.fromEntity(modifier));
    dto.message = roll.outcome.message;
    dto.recoveryModifier = roll.outcome.recoveryModifier;
    return dto;
  }
}
