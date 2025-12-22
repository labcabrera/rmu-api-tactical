import { Prop, Schema } from '@nestjs/mongoose';
import type { ActorRoundAlertType } from '../../../domain/value-objets/actor-round-alert-type.vo';

@Schema({ _id: false })
export class ActorRoundAlert {
  @Prop({ required: true })
  id: string;

  @Prop({ type: String, required: true })
  type: ActorRoundAlertType;

  @Prop({ type: String, required: true })
  value: string | undefined;
}
