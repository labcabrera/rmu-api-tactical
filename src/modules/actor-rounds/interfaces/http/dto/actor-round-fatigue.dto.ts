import { ApiProperty } from '@nestjs/swagger';
import { ActorRoundFatigue } from '../../../domain/value-objects/actor-round-fatigue.vo.js';

export class ActorRoundFatigueDto {
  @ApiProperty({ description: 'Endurance bonus: Body Development plus the racial bonus (spec 077)' })
  endurance: number;

  @ApiProperty({ description: 'Fatigue penalty points (0-50), the penalty is its negative' })
  fatigue: number;

  @ApiProperty({ description: 'Fatigue accumulator: an endurance roll is due at 100' })
  accumulator: number;

  @ApiProperty({ description: 'Rounds in a row without exertion: every 12 (24 at altitude) take one point (spec 077)' })
  restRounds: number;

  @ApiProperty({ description: 'The actor exerted itself this round, so the round is no rest (spec 077)' })
  exerted: boolean;

  static fromEntity(fatigue: ActorRoundFatigue): ActorRoundFatigueDto {
    const dto = new ActorRoundFatigueDto();
    dto.endurance = fatigue.endurance;
    dto.fatigue = fatigue.fatigue;
    dto.accumulator = fatigue.accumulator;
    dto.restRounds = fatigue.restRounds ?? 0;
    dto.exerted = fatigue.exerted ?? false;
    return dto;
  }
}
