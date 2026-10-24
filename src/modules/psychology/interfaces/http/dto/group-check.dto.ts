import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { DIFFICULTY_MAP, type Difficulty } from '../../../../actions/domain/value-objects/difficulty.vo.js';
import { ActorRoundDto } from '../../../../actor-rounds/interfaces/http/dto/actor-round.dto.js';
import type { ActorCheckResult, GroupCheckResult, LeaderCheckRoll } from '../../../application/cqrs/group-check.result.js';
import type { Leader } from '../../../application/services/group-check.service.js';
import { ResistanceModifierDto } from './resistance-roll.dto.js';

const DIFFICULTIES = [...DIFFICULTY_MAP.keys()];

export class GroupSelectionDto {
  @ApiProperty({ type: [String], required: false, description: 'Every actor of these factions' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  factionIds?: string[];

  @ApiProperty({ type: [String], required: false, description: 'And these actors' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actorIds?: string[];
}

export class LeaderRequestDto {
  @ApiProperty()
  @IsString()
  actorId: string;

  @ApiProperty({ required: false, default: true, description: 'The followers acknowledge the leader and know it is present' })
  @IsOptional()
  @IsBoolean()
  recognized?: boolean;

  @ApiProperty({ required: false, description: 'Leadership ranks of a leader without a sheet (NPC)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  leadershipRanks?: number;

  @ApiProperty({ required: false, description: 'Leadership bonus of a leader without a sheet (NPC)' })
  @IsOptional()
  @IsNumber()
  leadershipBonus?: number;
}

export class GroupCheckDto {
  @ApiProperty({ type: GroupSelectionDto, required: false, description: 'Who takes the check; by default the faction of the leader' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GroupSelectionDto)
  group?: GroupSelectionDto;

  @ApiProperty({ type: [ResistanceModifierDto], required: false, description: 'Other modifiers of the game master' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResistanceModifierDto)
  modifiers?: ResistanceModifierDto[];
}

export class FearCheckDto extends GroupCheckDto {
  @ApiProperty({ type: LeaderRequestDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LeaderRequestDto)
  leader?: LeaderRequestDto;

  @ApiProperty({ required: false, description: 'Fright level (attack level of the RRs)', example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  frightLevel?: number;

  @ApiProperty({ required: false, description: 'Actor whose Intimidation ranks are the attack level' })
  @IsOptional()
  @IsString()
  intimidatorActorId?: string;

  @ApiProperty({ required: false, description: 'Intimidation ranks of an intimidating actor without a sheet (NPC)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  intimidationRanks?: number;

  @ApiProperty({ required: false, type: Object, additionalProperties: { type: 'number' }, description: 'Roll by actor id' })
  @IsOptional()
  @IsObject()
  rolls?: Record<string, number>;

  @ApiProperty({ required: false, type: Object, additionalProperties: { type: 'number' }, description: 'Fear RR bonus by actor id' })
  @IsOptional()
  @IsObject()
  bonuses?: Record<string, number>;
}

export class LeaderRollDto extends GroupCheckDto {
  @ApiProperty({ type: LeaderRequestDto })
  @ValidateNested()
  @Type(() => LeaderRequestDto)
  leader: LeaderRequestDto;

  @ApiProperty({ required: false, description: 'Open-ended roll of the leader; rolled by the server when missing' })
  @IsOptional()
  @IsNumber()
  roll?: number;

  @ApiProperty({ required: false, description: 'First roll of the open-ended one when it differs from roll (66: unusual event)' })
  @IsOptional()
  @IsInt()
  unmodifiedRoll?: number;
}

export class MoraleCheckDto extends LeaderRollDto {
  @ApiProperty({ required: false, enum: DIFFICULTIES, default: 'm', description: 'How reasonable the command looks' })
  @IsOptional()
  @IsIn(DIFFICULTIES)
  difficulty?: Difficulty;

  @ApiProperty({ required: false, type: Object, additionalProperties: { type: 'number' }, description: 'Fear RR bonus by actor id' })
  @IsOptional()
  @IsObject()
  bonuses?: Record<string, number>;
}

export class LeaderDto {
  @ApiProperty()
  actorId: string;

  @ApiProperty()
  actorRoundId: string;

  @ApiProperty()
  recognized: boolean;

  @ApiProperty()
  leadershipRanks: number;

  @ApiProperty()
  leadershipBonus: number;

  @ApiProperty()
  lookOfEaglesTier: number;

  @ApiProperty({ description: 'Added to the fear RRs of the followers' })
  fearRrBonus: number;

  static from(leader: Leader): LeaderDto {
    const { actorRound, ...rest } = leader;
    return { actorId: actorRound.actorId, actorRoundId: actorRound.id, ...rest };
  }
}

export class UnusualEventDto {
  @ApiProperty()
  roll: number;

  @ApiProperty({ description: 'Outcome key (misunderstands-order, leader-fired-up...)' })
  outcome: string;

  @ApiProperty({ required: false })
  leaderFearRrBonus?: number;

  @ApiProperty({ required: false })
  leaderHits?: number;

  @ApiProperty({ required: false })
  durationDays?: number;
}

export class LeaderCheckRollDto {
  @ApiProperty()
  roll: number;

  @ApiProperty()
  rolledByServer: boolean;

  @ApiProperty({ type: [ResistanceModifierDto] })
  breakdown: ResistanceModifierDto[];

  @ApiProperty()
  total: number;

  @ApiProperty({ required: false, description: 'Result key of the table (absolute-failure...)' })
  result?: string;

  @ApiProperty({ type: UnusualEventDto, required: false })
  unusualEvent?: UnusualEventDto;

  static from(roll: LeaderCheckRoll): LeaderCheckRollDto {
    return { ...roll };
  }
}

export class ActorCheckResultDto {
  @ApiProperty()
  actorId: string;

  @ApiProperty()
  actorRoundId: string;

  @ApiProperty()
  actorName: string;

  @ApiProperty()
  factionId: string;

  @ApiProperty({ enum: ['skipped', 'resisted', 'afraid', 'follower'] })
  status: string;

  @ApiProperty({ required: false })
  roll?: number;

  @ApiProperty({ required: false })
  rolledByServer?: boolean;

  @ApiProperty({ required: false })
  bonus?: number;

  @ApiProperty({ type: [ResistanceModifierDto], required: false })
  breakdown?: ResistanceModifierDto[];

  @ApiProperty({ required: false })
  total?: number;

  @ApiProperty({ required: false })
  required?: number;

  @ApiProperty({ required: false })
  failure?: number;

  @ApiProperty({ required: false, enum: ['mild', 'moderate', 'severe', 'extreme'] })
  severity?: string;

  @ApiProperty({ required: false, description: 'Fear effect before the check (fear-balk...)' })
  previousEffect?: string;

  @ApiProperty({ required: false, description: 'Fear effect after the check' })
  effect?: string;

  @ApiProperty({ type: [String], description: 'no-attacks for routed and broken actors' })
  restrictions: string[];

  @ApiProperty({ type: [String], description: 'no-fear-rr-bonus...' })
  warnings: string[];

  static from(result: ActorCheckResult): ActorCheckResultDto {
    return { ...result };
  }
}

export class GroupCheckResultDto {
  @ApiProperty({ enum: ['fear', 'morale', 'rally'] })
  kind: string;

  @ApiProperty()
  gameId: string;

  @ApiProperty()
  round: number;

  @ApiProperty({ type: LeaderDto, required: false })
  leader?: LeaderDto;

  @ApiProperty({ required: false })
  frightLevel?: number;

  @ApiProperty({ type: LeaderCheckRollDto, required: false })
  leaderRoll?: LeaderCheckRollDto;

  @ApiProperty({ required: false, description: 'Morale: refuses-hostile|refuses|needs-clarification|obeys|inspired...' })
  outcome?: string;

  @ApiProperty({ required: false })
  moraleModifier?: number;

  @ApiProperty({ required: false })
  moraleModifierDays?: number;

  @ApiProperty({ required: false, description: 'Rally: severity steps (negative calms)' })
  fearSeverityChange?: number;

  @ApiProperty({ type: [ActorCheckResultDto] })
  actors: ActorCheckResultDto[];

  @ApiProperty({ type: [ActorRoundDto], description: 'Actor rounds written by the check' })
  actorRounds: ActorRoundDto[];

  static from(result: GroupCheckResult): GroupCheckResultDto {
    return {
      ...result,
      leader: result.leader ? LeaderDto.from(result.leader) : undefined,
      leaderRoll: result.leaderRoll ? LeaderCheckRollDto.from(result.leaderRoll) : undefined,
      actors: result.actors.map(actor => ActorCheckResultDto.from(actor)),
      actorRounds: result.actorRounds.map(round => ActorRoundDto.fromEntity(round)),
    };
  }
}
