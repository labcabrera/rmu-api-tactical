import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ActorRoundHP {
  @Prop({ required: true })
  max: number;

  @Prop({ required: true })
  current: number;
}

@Schema({ _id: false })
export class ActorRoundEffect {
  @Prop({ required: true })
  status: string;

  @Prop({ type: Number, required: false })
  value: number | undefined;

  @Prop({ type: Number, required: false })
  rounds: number | undefined;
}

@Schema({ _id: false })
export class ActorRoundInitiative {
  @Prop({ required: true })
  base: number;
  @Prop({ required: true })
  penalty: number;

  @Prop({ type: Number, required: false })
  roll: number | undefined;

  @Prop({ type: Number, required: false })
  total: number | undefined;
}
