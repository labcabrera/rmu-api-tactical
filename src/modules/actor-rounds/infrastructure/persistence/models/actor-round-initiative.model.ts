import { Prop, Schema } from '@nestjs/mongoose';

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
