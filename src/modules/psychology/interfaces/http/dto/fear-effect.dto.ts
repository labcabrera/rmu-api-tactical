import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ActorRoundDto } from '../../../../actor-rounds/interfaces/http/dto/actor-round.dto.js';
import type { FearEffectResult, FrightLevels } from '../../../application/cqrs/handlers/fear-effect.handlers.js';
import type { FailureSeverity, FearState } from '../../../domain/value-objects/psychology-tables.vo.js';

export class FearEffectSourceDto {
  @ApiProperty({ required: false, description: 'Actor of the game that frightened' })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiProperty({ required: false, description: 'Name of what frightened' })
  @IsOptional()
  @IsString()
  name?: string;
}

/** Workspace spec 068, decision 15: the result of an individual fear RR. */
export class ApplyFearEffectDto {
  @ApiProperty({ type: String, enum: ['mild', 'moderate', 'severe', 'extreme'], description: 'Failure severity of the RR' })
  @IsIn(['mild', 'moderate', 'severe', 'extreme'])
  severity: FailureSeverity;

  @ApiProperty({ type: FearEffectSourceDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => FearEffectSourceDto)
  source?: FearEffectSourceDto;
}

export class FearEffectResultDto {
  @ApiProperty({ type: String, enum: ['balk', 'retreat', 'routed', 'broken'] })
  fearState: FearState;

  @ApiProperty({ description: 'The fear effect the actor ends with (the worst state)' })
  effect: { id: string; status: string };

  @ApiProperty({ description: 'The actor already had that state or a worse one' })
  unchanged: boolean;

  @ApiProperty({ type: ActorRoundDto })
  actorRound: ActorRoundDto;

  static from(result: FearEffectResult): FearEffectResultDto {
    return {
      fearState: result.fearState,
      effect: { id: result.effect.id, status: result.effect.status },
      unchanged: result.unchanged,
      actorRound: ActorRoundDto.fromEntity(result.actorRound),
    };
  }
}

export class FrightLevelDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  level: number;
}

export class FallenThresholdDto {
  @ApiProperty({ description: 'Share of fallen allies (0-1)' })
  minShare: number;

  @ApiProperty({ description: 'The share must be above minShare (true) or at least minShare (false)' })
  exclusive: boolean;

  @ApiProperty()
  frightLevel: number;
}

/** Workspace spec 068 (S12 b): the fright levels of Table 14-3a for any participant. */
export class FrightLevelsDto {
  @ApiProperty({ type: [FrightLevelDto] })
  frightLevels: FrightLevelDto[];

  @ApiProperty({ type: [FrightLevelDto] })
  frightLevelModifiers: FrightLevelDto[];

  @ApiProperty({ type: [FallenThresholdDto] })
  fallenThresholds: FallenThresholdDto[];

  static from(levels: FrightLevels): FrightLevelsDto {
    return { ...levels };
  }
}
