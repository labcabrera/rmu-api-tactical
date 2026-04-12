import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ActorRoundShield {
  @Prop({ type: Number, required: true })
  public readonly db: number;

  @Prop({ type: Number, required: true })
  public readonly blockCount: number;

  @Prop({ type: Number, required: true })
  public readonly currentBlocks: number;
}
