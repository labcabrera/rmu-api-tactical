import { Prop, Schema } from '@nestjs/mongoose';
import * as ae from '../../../domain/entities/action.aggregate';

@Schema({ _id: false })
export class ActionAttack {
  @Prop({ type: String, required: false })
  attackId: string | undefined;

  @Prop({ required: true })
  attackName: string;

  @Prop({ required: true })
  targetId: string;

  @Prop({ required: true })
  parry: number;

  @Prop({ required: true })
  status: ae.ActionStatus;
}

@Schema({ _id: false })
export class ActionManeuverResult {
  @Prop({ type: Object, required: true })
  bonus: { [key: string]: number };

  @Prop({ type: Number, required: true })
  roll: number;

  @Prop({ type: Number, required: true })
  result: number;

  @Prop({ type: String, required: true })
  description: string;
}

@Schema({ _id: false })
export class ActionManeuver {
  @Prop({ type: String, required: true })
  skillId: string;

  @Prop({ type: String, required: true })
  maneuverType: ae.ManeuverType;

  @Prop({ type: String, required: false })
  difficulty: ae.ManeuverDifficulty | undefined;

  @Prop({ type: ActionManeuverResult, required: false })
  result: ActionManeuverResult | undefined;

  @Prop({ type: String, required: false })
  status: ae.ActionStatus;
}
