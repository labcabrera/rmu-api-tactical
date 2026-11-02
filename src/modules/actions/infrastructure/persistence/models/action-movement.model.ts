import type { LightType } from '../../../domain/value-objects/light-type.vo.js';
import { Prop, Schema } from '@nestjs/mongoose';
import type { Difficulty } from '../../../domain/value-objects/difficulty.vo.js';
import type { Pace } from '../../../domain/value-objects/pace.vo.js';
import { ActionRoll } from './action-roll.model.js';

@Schema({ _id: false })
export class ActionMovementModifiers {
  @Prop({ type: String, required: true })
  pace: Pace;

  @Prop({ type: Boolean, required: true })
  requiredManeuver: boolean;

  @Prop({ type: String, required: false })
  skillId: string | null;

  @Prop({ type: String, required: false })
  difficulty: Difficulty | null;

  @Prop({ type: Number, required: false })
  customBonus: number | null;

  @Prop({ type: String, required: false })
  light?: LightType | null;
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
  critical: string | null;

  @Prop({ type: String, required: true })
  description: string;
}

@Schema({ _id: false })
export class ActionMovement {
  @Prop({ type: ActionMovementModifiers, required: true })
  modifiers: ActionMovementModifiers;

  @Prop({ type: ActionRoll, required: false })
  roll: ActionRoll | null;

  @Prop({ type: ActionMovementResult, required: false })
  calculated: ActionMovementResult;
}
