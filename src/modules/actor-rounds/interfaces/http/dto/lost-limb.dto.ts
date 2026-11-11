import { ApiProperty } from '@nestjs/swagger';
import type { BodySide } from '../../../domain/value-objects/injury.vo.js';
import {
  LOST_LIMB_LOCATIONS,
  type LostLimb,
  type LostLimbCause,
  type LostLimbLocation,
} from '../../../domain/value-objects/lost-limb.vo.js';

/** Workspace spec 079, C1: a limb the actor lost for good. */
export class LostLimbDto {
  @ApiProperty({ type: String, enum: LOST_LIMB_LOCATIONS })
  location: LostLimbLocation;

  @ApiProperty({ type: String, enum: ['left', 'right'] })
  side: BodySide;

  @ApiProperty()
  at: string;

  @ApiProperty({ type: String, enum: ['amputation', 'limb-loss'], required: false })
  cause?: LostLimbCause;

  @ApiProperty({ required: false })
  tacticalGameId?: string;

  @ApiProperty({ required: false, description: 'The injury that cost the limb' })
  injuryId?: string;

  @ApiProperty({ required: false, description: 'Day of the campaign, when strategic knows it' })
  gameDay?: number;

  static fromEntity(entity: LostLimb): LostLimbDto {
    return Object.assign(new LostLimbDto(), entity);
  }
}
