import { ApiProperty } from '@nestjs/swagger';
import { ActorRoundDto } from '../../../../actor-rounds/interfaces/http/dto/actor-round.dto.js';
import { PoisonExposureDto } from '../../../../actor-rounds/interfaces/http/dto/poison.dto.js';
import { ResistanceModifierDto } from '../../../../psychology/interfaces/http/dto/resistance-roll.dto.js';
import type {
  CreatePoisoningResult,
  GiveAntidoteResult,
  ResolvePoisoningResult,
} from '../../../application/cqrs/handlers/poisoning.handlers.js';

export class PoisonExposureResultDto {
  @ApiProperty({ type: ActorRoundDto })
  actorRound: ActorRoundDto;

  @ApiProperty({ type: PoisonExposureDto })
  exposure: PoisonExposureDto;

  static from(result: CreatePoisoningResult): PoisonExposureResultDto {
    const dto = new PoisonExposureResultDto();
    dto.actorRound = ActorRoundDto.fromEntity(result.actorRound);
    dto.exposure = PoisonExposureDto.fromEntity(result.exposure);
    return dto;
  }
}

export class PoisonRrDto {
  @ApiProperty()
  roll: number;

  @ApiProperty({ description: 'Poison RR bonus used' })
  bonus: number;

  @ApiProperty({ description: 'Level of the poison' })
  attackLevel: number;

  @ApiProperty({ type: [ResistanceModifierDto], description: 'Every term of the total' })
  breakdown: ResistanceModifierDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  required: number;

  @ApiProperty()
  resisted: boolean;

  @ApiProperty()
  failure: number;

  @ApiProperty({ required: false, enum: ['mild', 'moderate', 'severe', 'extreme'] })
  severity?: string;
}

export class ResolvePoisoningResultDto {
  @ApiProperty({ type: ActorRoundDto })
  actorRound: ActorRoundDto;

  @ApiProperty({ type: PoisonRrDto })
  rr: PoisonRrDto;

  @ApiProperty({ required: false, description: 'The poisoning injury, when the RR failed' })
  injuryId?: string;

  static from(result: ResolvePoisoningResult): ResolvePoisoningResultDto {
    const dto = new ResolvePoisoningResultDto();
    dto.actorRound = ActorRoundDto.fromEntity(result.actorRound);
    const { roll, breakdown, total, required, resisted, failure, severity } = result.result;
    dto.rr = { roll, bonus: result.bonus, attackLevel: result.attackLevel, breakdown, total, required, resisted, failure, severity };
    dto.injuryId = result.injury?.id;
    return dto;
  }
}

export class AntidoteResultDto {
  @ApiProperty({ type: ActorRoundDto })
  actorRound: ActorRoundDto;

  @ApiProperty()
  injuryId: string;

  @ApiProperty({ description: 'The antidote neutralized the poison' })
  neutralized: boolean;

  static from(result: GiveAntidoteResult): AntidoteResultDto {
    const dto = new AntidoteResultDto();
    dto.actorRound = ActorRoundDto.fromEntity(result.actorRound);
    dto.injuryId = result.injury.id;
    dto.neutralized = result.neutralized;
    return dto;
  }
}
