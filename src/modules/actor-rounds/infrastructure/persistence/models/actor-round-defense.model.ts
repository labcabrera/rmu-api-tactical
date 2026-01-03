import { Prop, Schema } from '@nestjs/mongoose';
import { ActorRoundShield } from './actor-round-shield.model';

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

  @Prop({ type: ActorRoundShield, required: false })
  public readonly shield: ActorRoundShield | undefined;
}
