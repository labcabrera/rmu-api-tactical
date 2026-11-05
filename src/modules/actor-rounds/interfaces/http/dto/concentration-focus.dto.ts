import { ApiProperty } from '@nestjs/swagger';
import type { ConcentrationFocus, ConcentrationKind } from '../../../domain/value-objects/concentration-focus.vo.js';

/** What the actor concentrates on (workspace spec 077, decision A2.1). */
export class ConcentrationFocusDto {
  @ApiProperty({
    type: String,
    enum: ['partial-dodge', 'partial-block', 'held-action', 'spell-preparation', 'hold-position', 'manual'],
    example: 'partial-dodge',
  })
  kind: ConcentrationKind;

  @ApiProperty({ required: false, description: 'The held action, or the action of a concentrating effect' })
  actionId?: string;

  @ApiProperty({ required: false, description: 'The concentrating effect it comes from' })
  effectId?: string;

  @ApiProperty({ required: false, description: 'Round it started (held actions and effects)', example: 2 })
  since?: number;

  @ApiProperty({ required: false })
  note?: string;

  static fromEntity(entity: ConcentrationFocus): ConcentrationFocusDto {
    return Object.assign(new ConcentrationFocusDto(), entity);
  }
}
