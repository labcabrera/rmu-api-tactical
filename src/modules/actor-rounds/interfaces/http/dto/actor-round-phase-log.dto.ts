import { ApiProperty } from '@nestjs/swagger';
import { ActorRoundPhaseLog } from '../../../domain/value-objects/actor-round-phase-log.vo.js';

export class ActorRoundPhaseLogDto {
  @ApiProperty({ description: 'Action phase (1-4)', example: 2 })
  phase: number;

  @ApiProperty({ description: 'Action points spent in the phase', example: 1 })
  spentAp: number;

  @ApiProperty({ description: 'Action points spent in the round up to the end of the phase', example: 2 })
  totalSpentAp: number;

  static fromEntity(entity: ActorRoundPhaseLog): ActorRoundPhaseLogDto {
    const dto = new ActorRoundPhaseLogDto();
    dto.phase = entity.phase;
    dto.spentAp = entity.spentAp;
    dto.totalSpentAp = entity.totalSpentAp;
    return dto;
  }
}
