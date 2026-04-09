import { Prop, Schema } from '@nestjs/mongoose';
import type { ActorRoundAlertStatus } from '../../../domain/value-objets/actor-round-alert-status.vo';
import type { ActorRoundAlertType } from '../../../domain/value-objets/actor-round-alert-type.vo';

@Schema({ _id: false })
export class ActorRoundAlert {
  @Prop({ required: true })
  id: string;

  @Prop({ type: String, required: true })
  type: ActorRoundAlertType;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: [{ key: String, value: Number, modifier: String }], required: false })
  modifiers?: { key: string; value: number; modifier: string }[];

  @Prop({ type: String, required: true, default: 'pending' })
  status: ActorRoundAlertStatus;
}
