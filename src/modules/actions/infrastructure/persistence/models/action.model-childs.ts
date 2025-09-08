import { Prop, Schema } from '@nestjs/mongoose';
import type { ActionStatus } from '../../../domain/entities/action-status.vo';
import { ManeuverDifficulty } from '../../../domain/entities/maneuver-dificulty.vo';
import type { ManeuverType } from '../../../domain/entities/maneuver-type.vo';

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
  maneuverType: ManeuverType;

  @Prop({ type: String, required: false })
  difficulty: ManeuverDifficulty | undefined;

  @Prop({ type: ActionManeuverResult, required: false })
  result: ActionManeuverResult | undefined;

  @Prop({ type: String, required: false })
  status: ActionStatus;
}
