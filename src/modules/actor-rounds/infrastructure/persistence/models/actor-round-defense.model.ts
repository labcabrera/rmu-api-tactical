import { Prop, Schema } from '@nestjs/mongoose';
import { ActorRoundShield } from './actor-round-shield.model';

@Schema({ _id: false })
export class ActorRoundDefense {
  @Prop({ required: true })
  public readonly bd: number;

  @Prop({ type: Number, required: false })
  public readonly at: number | null;

  @Prop({ type: Number, required: false })
  public readonly bodyAt: number | null;

  @Prop({ type: Number, required: false })
  public readonly headAt: number | null;

  @Prop({ type: Number, required: false })
  public readonly armsAt: number | null;

  @Prop({ type: Number, required: false })
  public readonly legsAt: number | null;

  @Prop({ type: ActorRoundShield, required: false })
  public readonly shield: ActorRoundShield | null;

  @Prop({ type: Number, required: false })
  public readonly protect: number;
}
