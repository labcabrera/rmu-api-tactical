import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ActionMovementModifiers {
  @Prop({ type: String, required: true })
  pace: string;

  @Prop({ type: Boolean, required: true })
  requiredManeuver: boolean;

  @Prop({ type: String, required: false })
  skillId: string | undefined;

  @Prop({ type: String, required: false })
  difficulty: string | undefined;

  @Prop({ type: Number, required: false })
  customBonus: number | undefined;
}

@Schema({ _id: false })
export class ActionMovementBonus {
  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: Number, required: true })
  value: number;
}

@Schema({ _id: false })
export class ActionMovementRoll {
  @Prop({ type: [ActionMovementBonus], required: false })
  rollModifiers: ActionMovementBonus[];

  @Prop({ type: Number, required: true })
  roll: number;

  @Prop({ type: Number, required: true })
  totalRoll: number;
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

  @Prop({ type: String, required: false })
  critical: string | undefined;

  @Prop({ type: String, required: true })
  description: string;
}

@Schema({ _id: false })
export class ActionMovement {
  @Prop({ type: ActionMovementModifiers, required: true })
  modifiers: ActionMovementModifiers;

  @Prop({ type: ActionMovementRoll, required: false })
  roll: ActionMovementRoll | undefined;

  @Prop({ type: ActionMovementResult, required: false })
  calculated: ActionMovementResult;
}
