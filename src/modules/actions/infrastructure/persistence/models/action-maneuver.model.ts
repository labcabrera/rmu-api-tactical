import type { ManeuverPurpose, PrecisionPosition } from '../../../domain/value-objects/maneuver-purpose.vo.js';
import type { AdrenalManeuverOutcome, GrappleEscapeResult, ManeuverRollTalent } from '../../../domain/value-objects/action-maneuver.vo.js';
import type { ComplementaryChoice, SimilarityChoice } from '../../../domain/services/skill-aids.js';
import type { FeatOfStrengthChoices, FeatOfStrengthResult } from '../../../domain/services/feat-of-strength.js';
import { Prop, Schema } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import type { Difficulty } from '../../../domain/value-objects/difficulty.vo.js';
import type { LightType } from '../../../domain/value-objects/light-type.vo.js';
import type { LightManeuverModifier } from '../../../domain/value-objects/light-maneuver-modifier.vo.js';
import type { ManeuverModifierSelection } from '../../../domain/value-objects/maneuver-profile.vo.js';
import type { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo.js';
import { ActionRoll } from './action-roll.model.js';

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

  @Prop({ type: String, required: false })
  targetActorId: string | undefined;

  @Prop({ type: String, required: false })
  passiveSkillId: string | undefined;

  @Prop({ type: String, required: false })
  purpose: ManeuverPurpose | undefined;

  @Prop({ type: String, required: false })
  foeActorId: string | undefined;

  @Prop({ type: Number, required: false })
  foeLevel: number | undefined;

  @Prop({ type: String, required: false })
  position: PrecisionPosition | undefined;

  @Prop({ type: Number, required: false })
  obPenalty: number | undefined;

  /** Workspace spec 079, decision B1. */
  @Prop({ type: Object, required: false })
  similarity: SimilarityChoice | undefined;

  @Prop({ type: [Object], required: false, default: undefined })
  complementary: ComplementaryChoice[] | undefined;

  /** Workspace spec 079, decision B2. */
  @Prop({ type: Object, required: false })
  featOfStrength: FeatOfStrengthChoices | undefined;

  /** Workspace spec 079, D3. */
  @Prop({ type: [String], required: false, default: undefined })
  situationalTraits: string[] | undefined;

  @Prop({ type: String, required: false })
  senseTargetActorId: string | undefined;
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

  @Prop({ type: Number, required: false })
  price: number | undefined;

  @Prop({ type: String, required: false })
  outcome: string | undefined;

  @Prop({ type: Number, required: false })
  moraleModifier: number | undefined;

  @Prop({ type: Number, required: false })
  moraleModifierDays: number | undefined;

  @Prop({ type: String, required: false })
  rollTalent: ManeuverRollTalent | undefined;

  /** Workspace spec 077, decision A3.3: the roll against each grapple of an escape. */
  @Prop({ type: [Object], required: false })
  grappleEscape: GrappleEscapeResult[] | undefined;

  /** Workspace spec 077, decision D4: severity steps of a fall-control maneuver. */
  @Prop({ type: Number, required: false })
  fallControlSteps: number | undefined;

  /** Workspace spec 079, decision B2: the difficulty of a feat of strength. */
  @Prop({ type: Object, required: false })
  featOfStrength: FeatOfStrengthResult | undefined;

  /** Workspace spec 079, decisions B3-B4: the outcome of an adrenal or Fortitude maneuver. */
  @Prop({ type: Object, required: false })
  adrenal: AdrenalManeuverOutcome | undefined;
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
