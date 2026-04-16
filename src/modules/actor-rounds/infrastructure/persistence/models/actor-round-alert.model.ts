import { Prop, Schema } from '@nestjs/mongoose';
import type { ActorRoundAlertStatus } from '../../../domain/value-objets/actor-round-alert-status.vo';
import type { ActorRoundAlertType } from '../../../domain/value-objets/actor-round-alert-type.vo';

@Schema({ _id: false })
export class ActorRoundAlertModifier {
  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: Number, required: false })
  value: number | null;

  @Prop({ type: String, required: false })
  modifier: string | null;
}

@Schema({ _id: false })
export class ActorRoundAlert {
  @Prop({ required: true })
  id: string;

  @Prop({ type: String, required: true })
  type: ActorRoundAlertType;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: [ActorRoundAlertModifier], required: false })
  modifiers: ActorRoundAlertModifier[] | null;

  @Prop({ type: String, required: true, default: 'pending' })
  status: ActorRoundAlertStatus;
}
