import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import type { ActorRoundBreath } from '../../../domain/value-objects/actor-round-breath.vo.js';
import type { ActorRound } from '../../../domain/aggregates/actor-round.js';

/** Workspace spec 079, C4 (§15.2): the breath the actor holds. */
export class ActorRoundBreathDto {
  @ApiProperty({ description: 'Round it started holding its breath in' })
  sinceRound: number;

  @ApiProperty({ description: 'It took a breath first (12 + Co bonus rounds) or was caught unawares (the bonus alone)' })
  prepared: boolean;

  @ApiProperty({ description: 'Underwater: a failed check inhales water (stunned -50)' })
  underwater: boolean;

  @ApiProperty()
  constitutionBonus: number;

  @ApiProperty({ type: String, enum: ['sheet', 'request', 'none'] })
  constitutionSource: 'sheet' | 'request' | 'none';

  @ApiProperty({ description: 'Rounds it holds its breath before the checks (at least 1)' })
  limitRounds: number;

  @ApiProperty({ description: 'Rounds held at the end of this round, the current one included' })
  heldRounds: number;

  @ApiProperty({ type: Number, nullable: true, description: 'Round of the failed check: it suffocates since' })
  failedRound: number | null;

  @ApiProperty({ type: String, nullable: true })
  note: string | null;

  @ApiPropertyOptional({
    description: 'Breath Holding (spec 079, D5): its rounds (12 × level, ×2 inactive, ×3 Meditation) and the flags; null without it',
    nullable: true,
  })
  breathHolding?: { rounds: number; level: number; inactive: boolean; meditation: boolean } | null;

  static fromEntity(breath: ActorRoundBreath, actorRound: Pick<ActorRound, 'breathHeldRounds'>): ActorRoundBreathDto {
    return Object.assign(new ActorRoundBreathDto(), { ...breath, heldRounds: actorRound.breathHeldRounds() ?? 0 });
  }
}

/** Body of `POST /v1/actor-rounds/:id/breath`: the actor starts holding its breath in this round (spec 079, C4). */
export class StartBreathDto {
  @ApiPropertyOptional({ description: 'It took a breath first (true by default)', default: true })
  @IsOptional()
  @IsBoolean()
  prepared?: boolean;

  @ApiPropertyOptional({ description: 'Underwater: a failed check inhales water (false by default)', default: false })
  @IsOptional()
  @IsBoolean()
  underwater?: boolean;

  @ApiPropertyOptional({
    description: 'Constitution bonus: the one of the character sheet by default; required for an NPC (0 when missing)',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(-50)
  @Max(50)
  constitutionBonus?: number;

  @ApiPropertyOptional({ description: 'Breath Holding (spec 079, D5): the actor stays inactive, twice the time', default: false })
  @IsOptional()
  @IsBoolean()
  inactive?: boolean;

  @ApiPropertyOptional({
    description: 'Breath Holding (spec 079, D5): a successful Meditation maneuver, three times the time',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  meditation?: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Dives after the key' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

/** Body of `PATCH /v1/actor-rounds/:id/environment-protection` (spec 079, C3). */
export class EnvironmentProtectionDto {
  @ApiProperty({ description: 'Protected from the extreme temperature of the environment: no critical in the upkeep' })
  @IsBoolean()
  protected: boolean;
}
