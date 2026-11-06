import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ActorRoundBoSpend {
  @Prop({ required: true })
  attackName: string;

  @Prop({ required: true })
  bo: number;
}

@Schema({ _id: false })
export class ActorRoundBoReservation {
  @Prop({ required: true })
  actionId: string;

  @Prop({ type: String, required: true })
  kind: 'parry' | 'attack';

  @Prop({ type: Number, required: false })
  parry?: number;

  @Prop({ type: [ActorRoundBoSpend], required: false, default: undefined })
  spends?: ActorRoundBoSpend[];
}
