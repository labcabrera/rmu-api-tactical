import { Prop, Schema } from '@nestjs/mongoose';
import type { ParryType } from '../../../domain/value-objects/action-attack.vo';

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
}
