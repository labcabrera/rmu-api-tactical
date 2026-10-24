import { Prop, Schema } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { Difficulty } from '../../../domain/value-objects/difficulty.vo';
import { LightType } from '../../../domain/value-objects/light-type.vo';
import { LightManeuverModifier } from '../../../domain/value-objects/light-maneuver-modifier.vo';
import type { ManeuverModifierSelection } from '../../../domain/value-objects/maneuver-profile.vo';
import type { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo';
import { ActionRoll } from './action-roll.model';

@Schema({ _id: false })
export class ActionManeuverModifiers {
  @Prop({ type: String, required: true })
  skillId: string;

  @Prop({ type: String, required: false })
  specialization: string | null | undefined;

  @Prop({ type: String, required: true })
  maneuverType: ManeuverType;

  @Prop({ type: String, required: false })
  difficulty: Difficulty | undefined;

  @Prop({ type: Number, required: false })
  customBonus: number | undefined;

  @Prop({ type: String, required: false })
  lightModifier: LightManeuverModifier | undefined;

  @Prop({ type: String, required: false })
  light: LightType | undefined;

  @Prop({ type: Boolean, required: false })
  armorModifier: boolean | undefined;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  selections: Record<string, ManeuverModifierSelection> | undefined;

  @Prop({ type: Number, required: false })
  passiveTotal: number | undefined;
}

@Schema({ _id: false })
export class ActionManeuverEffect {
  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Number, required: false })
  value: number | undefined;

  @Prop({ type: String, required: false })
  modifier: string | undefined;

  @Prop({ type: Number, required: false })
  rounds: number | undefined;

  @Prop({ type: Number, required: false })
  roundDelay: number | undefined;
}

@Schema({ _id: false })
export class ActionManeuverResult {
  @Prop({ type: String, required: false })
  result: string | undefined;

  @Prop({ type: Number, required: false })
  percent: number | undefined;

  @Prop({ type: String, required: false })
  message: string | undefined;

  @Prop({ type: [ActionManeuverEffect], required: false })
  effects: ActionManeuverEffect[] | undefined;

  @Prop({ type: String, required: false })
  critical: string | null | undefined;

  @Prop({ type: Boolean, required: false })
  completed: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  unusualEvent: boolean | undefined;
}

@Schema({ _id: false })
export class ActionManeuver {
  @Prop({ type: ActionManeuverModifiers, required: true })
  modifiers: ActionManeuverModifiers;

  @Prop({ type: ActionRoll, required: false })
  roll: ActionRoll | undefined;

  @Prop({ type: ActionManeuverResult, required: false })
  result: ActionManeuverResult | undefined;

  @Prop({ type: Number, required: false })
  progress: number | undefined;

  @Prop({ type: String, required: false })
  continuesActionId: string | undefined;
}
