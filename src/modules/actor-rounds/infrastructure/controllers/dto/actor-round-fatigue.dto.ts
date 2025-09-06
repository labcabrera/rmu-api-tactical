import { ApiProperty } from '@nestjs/swagger';
import { ActorRoundFatigue } from '../../../domain/entities/actor-round.entity';

export class ActorRoundFatigueDto {
  @ApiProperty({ description: 'Endurance points' })
  endurance: number;

  @ApiProperty({ description: 'Fatigue points' })
  fatigue: number;

  @ApiProperty({ description: 'Fatigue accumulator' })
  accumulator: number;

  static fromEntity(fatigue: ActorRoundFatigue): ActorRoundFatigueDto {
    const dto = new ActorRoundFatigueDto();
    dto.endurance = fatigue.endurance;
    dto.fatigue = fatigue.fatigue;
    dto.accumulator = fatigue.accumulator;
    return dto;
  }
}
