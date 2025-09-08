import { ApiProperty } from '@nestjs/swagger';
import { ActorRoundHP } from '../../../domain/entities/actor-round-hp.vo';

export class ActorRoundHPDto {
  @ApiProperty({ description: 'Base initiative value' })
  max: number;

  @ApiProperty({ description: 'Current initiative value' })
  current: number;

  static fromEntity(entity: ActorRoundHP): ActorRoundHPDto {
    const dto = new ActorRoundHPDto();
    dto.max = entity.max;
    dto.current = entity.current;
    return dto;
  }
}
