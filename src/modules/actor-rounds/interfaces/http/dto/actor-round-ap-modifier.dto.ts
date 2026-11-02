import { ApiProperty } from '@nestjs/swagger';
import type { ApModifierKind, ApModifierSource } from '../../../domain/value-objects/ap-modifier.vo.js';
import { ApModifier } from '../../../domain/value-objects/ap-modifier.vo.js';

export class ActorRoundApModifierDto {
  @ApiProperty({ type: String, description: 'What the modifier comes from', example: 'haste' })
  source: ApModifierSource;

  @ApiProperty({ type: String, description: 'Kind of modifier', enum: ['bonus', 'loss', 'cap', 'cost-multiplier'], example: 'bonus' })
  kind: ApModifierKind;

  @ApiProperty({ description: 'AP gained or lost, the cap, or the cost multiplier', example: 2 })
  value: number;

  @ApiProperty({ description: 'Phase of a loss that falls in a given phase (staggered)', required: false, example: 2 })
  phase?: number;

  @ApiProperty({ description: 'Effect the modifier comes from', required: false })
  effectId?: string;

  static fromEntity(entity: ApModifier): ActorRoundApModifierDto {
    const dto = new ActorRoundApModifierDto();
    dto.source = entity.source;
    dto.kind = entity.kind;
    dto.value = entity.value;
    dto.phase = entity.phase;
    dto.effectId = entity.effectId;
    return dto;
  }
}
