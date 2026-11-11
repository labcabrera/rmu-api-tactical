import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ActorRoundMovement {
  @Prop({ required: true })
  bmr: number;

  @Prop({ required: true })
  penalty: number;

  @Prop({ required: true })
  maxPace: string;

  @Prop({ required: true })
  baseDifficulty: string;

  // Workspace spec 079, D2
  @Prop({ type: Number, required: false })
  dodgePenalty?: number;
}
