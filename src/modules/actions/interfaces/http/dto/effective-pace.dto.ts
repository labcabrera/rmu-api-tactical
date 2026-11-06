import { ApiProperty } from '@nestjs/swagger';
import type { EffectivePace } from '../../../domain/services/free-movement-pace.js';

/** Workspace spec 080: the pace an action was made at and where it comes from. */
export class EffectivePaceDto {
  @ApiProperty({ description: 'Pace that counts (Table 5-3)', example: 'jog' })
  pace: string;

  @ApiProperty({
    description: 'manual: chosen by the game master; free-movement: the free movement of the actor at the same time',
    enum: ['manual', 'free-movement'],
  })
  source: 'manual' | 'free-movement';

  @ApiProperty({ description: 'The free movement action, when the pace comes from one', required: false })
  movementId?: string;

  static fromEntity(entity: EffectivePace): EffectivePaceDto {
    const dto = new EffectivePaceDto();
    dto.pace = entity.pace;
    dto.source = entity.source;
    if (entity.movementId) dto.movementId = entity.movementId;
    return dto;
  }
}
