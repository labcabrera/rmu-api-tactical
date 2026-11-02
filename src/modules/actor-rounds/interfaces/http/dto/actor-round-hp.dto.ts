import { ApiProperty } from '@nestjs/swagger';
import { ActorRoundHP } from '../../../domain/value-objects/actor-round-hp.vo.js';

export class ActorRoundHPDto {
  @ApiProperty({ description: 'Base initiative value' })
  max: number;

  @ApiProperty({ description: 'Current initiative value' })
  current: number;

  @ApiProperty({ description: 'Hits below zero the actor survives (Body Development bonus); max when missing', required: false })
  deathThreshold?: number;

  static fromEntity(entity: ActorRoundHP): ActorRoundHPDto {
    const dto = new ActorRoundHPDto();
    dto.max = entity.max;
    dto.current = entity.current;
    dto.deathThreshold = entity.deathThreshold;
    return dto;
  }
}
