import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ActorRoundDefense {
  @Prop({ required: true })
  public readonly bd: number;

  @Prop({ type: Number, required: false })
  public readonly at: number | undefined;

  @Prop({ type: Number, required: false })
  public readonly bodyAt: number | undefined;

  @Prop({ type: Number, required: false })
  public readonly headAt: number | undefined;

  @Prop({ type: Number, required: false })
  public readonly armsAt: number | undefined;

  @Prop({ type: Number, required: false })
  public readonly legsAt: number | undefined;
}
