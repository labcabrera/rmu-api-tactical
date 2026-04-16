import { Prop, Schema } from '@nestjs/mongoose';
import { Difficulty } from '../../../domain/value-objects/dificulty.vo';
import { LightType } from '../../../domain/value-objects/light-type.vo';
import { LightManeuverModifier } from '../../../domain/value-objects/ligth-maneuver-modifier.vo';
import type { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo';
import { ActionRoll } from './action-roll.model';

@Schema({ _id: false })
export class ActionManeuverModifiers {
  @Prop({ type: String, required: true })
  skillId: string;

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
}

@Schema({ _id: false })
export class ActionManeuverResult {
  @Prop({ type: String, required: false })
  result: string | undefined;

  @Prop({ type: Number, required: false })
  percent: number | undefined;

  @Prop({ type: String, required: false })
  message: string | undefined;
}

@Schema({ _id: false })
export class ActionManeuver {
  @Prop({ type: ActionManeuverModifiers, required: true })
  modifiers: ActionManeuverModifiers;

  @Prop({ type: ActionRoll, required: false })
  roll: ActionRoll | undefined;

  @Prop({ type: ActionManeuverResult, required: false })
  result: ActionManeuverResult | undefined;
}
