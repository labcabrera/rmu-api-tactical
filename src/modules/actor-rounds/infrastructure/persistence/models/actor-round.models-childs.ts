import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ActorRoundFatigue {
  @Prop({ required: true })
  fatigue: number;

  @Prop({ required: true })
  endurance: number;

  @Prop({ required: true })
  accumulator: number;
}

export class ActorRoundParry {
  @Prop({ required: true })
  attackName: string;

  @Prop({ required: true })
  parryValue: number;
}

@Schema({ _id: false })
export class ActorRoundEffect {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  status: string;

  @Prop({ type: Number, required: false })
  value: number | undefined;

  @Prop({ type: Number, required: false })
  rounds: number | undefined;
}
