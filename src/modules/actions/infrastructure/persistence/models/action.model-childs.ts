import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ActionAttack {
  @Prop({ type: String, required: false })
  attackId: string | undefined;

  @Prop({ required: true })
  attackType: string;

  @Prop({ required: true })
  targetId: string;

  @Prop({ required: true })
  parry: number;

  @Prop({ required: true })
  status: 'declared' | 'in_progress' | 'resolved';
}
