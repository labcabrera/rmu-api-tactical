import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import type { InjuryPatch } from '../../../domain/aggregates/actor-round.aggregate';
import { TACTICAL_PROCEDURES } from '../../../domain/services/injury-treatment';
import type { TacticalProcedure } from '../../../domain/services/injury-treatment';
import {
  BLEEDING_CONTROLS,
  BODY_LOCATIONS,
  INJURY_FLAGS,
  INJURY_SEVERITIES,
  INJURY_STATUSES,
  INJURY_TYPES,
} from '../../../domain/value-objets/injury.vo';
import type {
  BleedingControl,
  BodyLocation,
  BodySide,
  InjuryFlag,
  InjurySeverity,
  InjuryStatus,
  InjuryType,
} from '../../../domain/value-objets/injury.vo';
import type { StabilizeEffectResult } from '../../../application/cqrs/handlers/stabilize-effect.handler';
import type { TreatInjuryResult } from '../../../application/cqrs/handlers/treat-injury.handler';
import { ActorRoundDto } from './actor-round.dto';

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
  @ApiProperty({ enum: TACTICAL_PROCEDURES })
  @IsIn(TACTICAL_PROCEDURES)
  procedure: TacticalProcedure;
}

export class UpdateInjuryDto implements InjuryPatch {
  @ApiProperty({ enum: INJURY_TYPES, required: false })
  @IsOptional()
  @IsIn(INJURY_TYPES)
  type?: InjuryType;

  @ApiProperty({ enum: INJURY_SEVERITIES, required: false })
  @IsOptional()
  @IsIn(INJURY_SEVERITIES)
  severity?: InjurySeverity;

  @ApiProperty({ enum: BODY_LOCATIONS, required: false })
  @IsOptional()
  @IsIn(BODY_LOCATIONS)
  location?: BodyLocation;

  @ApiProperty({ enum: ['left', 'right'], required: false })
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

  @ApiProperty({ enum: BLEEDING_CONTROLS, required: false })
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

  @ApiProperty({ enum: INJURY_STATUSES, required: false })
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

  @ApiProperty({ description: 'Message of the medical maneuver table', required: false })
  message?: string;

  @ApiProperty({ description: 'Modifier to the recovery roll' })
  recoveryModifier: number;

  @ApiProperty({ required: false, description: 'Treatment kept in the injury' })
  treatment?: object;

  @ApiProperty({ required: false, description: 'Severity of the heat critical to resolve (cauterize)' })
  heatCritical?: string;

  @ApiProperty({ required: false, description: 'Rounds the dying effect gained (stabilize)' })
  roundsGained?: number;

  static fromTreatment(result: TreatInjuryResult): MedicalResultDto {
    const dto = MedicalResultDto.base(result.actorRound, result.roll);
    dto.treatment = result.treatment;
    dto.heatCritical = result.heatCritical;
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
    dto.message = roll.outcome.message;
    dto.recoveryModifier = roll.outcome.recoveryModifier;
    return dto;
  }
}
