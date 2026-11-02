import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ActorRoundHP {
  constructor(max: number, current: number, deathThreshold?: number) {
    this.max = max;
    this.current = current;
    this.deathThreshold = deathThreshold;
  }

  @Prop({ required: true })
  max: number;

  @Prop({ required: true })
  current: number;

  @Prop({ type: Number, required: false })
  deathThreshold?: number;
}
