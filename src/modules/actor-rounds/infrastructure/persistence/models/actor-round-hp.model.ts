import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ActorRoundHP {
  constructor(max: number, current: number) {
    this.max = max;
    this.current = current;
  }

  @Prop({ required: true })
  max: number;

  @Prop({ required: true })
  current: number;
}
