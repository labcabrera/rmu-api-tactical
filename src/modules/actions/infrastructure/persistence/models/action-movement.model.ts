import { Prop, Schema } from '@nestjs/mongoose';
import type { Pace } from '../../../domain/value-objects/action-movement.vo';
import { Difficulty } from '../../../domain/value-objects/dificulty.vo';
import { ActionRoll } from './action-roll.model';

@Schema({ _id: false })
export class ActionMovementModifiers {
  @Prop({ type: String, required: true })
  pace: Pace;

  @Prop({ type: Boolean, required: true })
  requiredManeuver: boolean;

  @Prop({ type: String, required: false })
  skillId: string | undefined;

  @Prop({ type: String, required: false })
  difficulty: Difficulty | undefined;

  @Prop({ type: Number, required: false })
  customBonus: number | undefined;
}

@Schema({ _id: false })
export class ActionMovementResult {
  @Prop({ type: Number, required: true })
  bmr: number;

  @Prop({ type: Number, required: true })
  paceMultiplier: number;

  @Prop({ type: Number, required: true })
  percent: number;

  @Prop({ type: Number, required: true })
  distance: number;

  @Prop({ type: Number, required: true })
  distanceAdjusted: number;

  @Prop({ type: String, required: false })
  critical: string | undefined;

  @Prop({ type: String, required: true })
  description: string;
}

@Schema({ _id: false })
export class ActionMovement {
  @Prop({ type: ActionMovementModifiers, required: true })
  modifiers: ActionMovementModifiers;

  @Prop({ type: ActionRoll, required: false })
  roll: ActionRoll | undefined;

  @Prop({ type: ActionMovementResult, required: false })
  calculated: ActionMovementResult;
}
