import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ActorRoundHP {
  @Prop({ required: true })
  max: number;

  @Prop({ required: true })
  current: number;
}

@Schema({ _id: false })
export class ActorRoundFatigue {
  @Prop({ required: true })
  fatigue: number;

  @Prop({ required: true })
  endurance: number;

  @Prop({ required: true })
  accumulator: number;
}

@Schema({ _id: false })
export class ActorRoundPenalty {
  @Prop({ required: true })
  key: number;

  @Prop({ required: true })
  value: number;
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
