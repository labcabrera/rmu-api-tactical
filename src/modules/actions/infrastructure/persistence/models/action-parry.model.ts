import { Prop, Schema } from '@nestjs/mongoose';
import type { ProtectPosition } from '../../../domain/value-objects/action-attack-modifiers.vo.js';
import type { ParryType } from '../../../domain/value-objects/parry-type.vo.js';

@Schema({ _id: false })
export class ActionParry {
  @Prop({ type: String, required: true })
  id: string;

  @Prop({ type: String, required: true })
  actorId: string;

  @Prop({ type: String, required: true })
  targetActorId: string;

  @Prop({ type: String, required: true })
  parryType: ParryType;

  @Prop({ type: String, required: false })
  targetAttackName: string | undefined;

  @Prop({ type: Number, required: true })
  parryAvailable: number;

  @Prop({ type: Number, required: true })
  parry: number;

  @Prop({ type: Number, required: false })
  penalty?: number;

  @Prop({ type: String, required: false })
  protectPosition?: ProtectPosition;

  @Prop({ type: Boolean, required: false })
  carriedOver?: boolean;

  @Prop({ type: Boolean, required: false })
  fullParry?: boolean;
}
