import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ActionMovement {
  @Prop({ type: String, required: true })
  pace: string;

  @Prop({ type: String, required: false })
  skillId: string | undefined;

  @Prop({ type: Number, required: false })
  roll: number | undefined;

  @Prop({ type: Number, required: false })
  distance: number | undefined;
}
