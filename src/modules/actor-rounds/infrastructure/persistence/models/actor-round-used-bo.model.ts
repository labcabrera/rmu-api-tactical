import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ActorRoundUsedBo {
  @Prop({ required: true })
  public readonly attackName: string;

  @Prop({ required: true })
  public readonly usedBo: number;
}
