import { Prop, Schema } from '@nestjs/mongoose';
import type { ProtectPosition } from '../../../domain/value-objects/action-attack-modifiers.vo.js';
import type { ParryType } from '../../../domain/value-objects/parry-type.vo.js';
import type { ParryManeuver, ParryPositional } from '../../../domain/value-objects/action-attack-parry.vo.js';

@Schema({ _id: false })
export class ParryBreakdownModel {
  @Prop({ type: String, required: true })
  attackName: string;

  @Prop({ type: Number, required: true })
  bo: number;

  @Prop({ type: Number, required: true })
  penalty: number;

  @Prop({ type: Number, required: false })
  protectPenalty?: number;
}

@Schema({ _id: false })
export class ParryExclusionModel {
  @Prop({ type: String, required: true })
  actorId: string;

  @Prop({ type: String, required: true })
  targetActorId: string;

  @Prop({ type: String, required: true })
  parryType: ParryType;

  @Prop({ type: String, required: true })
  reason: string;

  @Prop({ type: Object, required: false })
  params?: Record<string, number | string | boolean>;
}

@Schema({ _id: false })
export class ActionParry {
  @Prop({ type: String, required: true })
  id: string;

  @Prop({ type: String, required: true })
  actorId: string;

  @Prop({ type: String, required: true })
  targetActorId: string;

  @Prop({ type: String, required: true })
  parryType: ParryType;

  @Prop({ type: String, required: false })
  targetAttackName: string | undefined;

  @Prop({ type: Number, required: true })
  parryAvailable: number;

  @Prop({ type: Number, required: true })
  parry: number;

  @Prop({ type: Number, required: false })
  penalty?: number;

  @Prop({ type: String, required: false })
  protectPosition?: ProtectPosition;

  @Prop({ type: Boolean, required: false })
  carriedOver?: boolean;

  @Prop({ type: Boolean, required: false })
  fullParry?: boolean;

  @Prop({ type: ParryBreakdownModel, required: false })
  breakdown?: ParryBreakdownModel;

  /** Workspace spec 079, decision A2: flank or rear attacker, and the defender's Reverse Strike. */
  @Prop({ type: Object, required: false })
  positional?: ParryPositional | null;

  /** Workspace spec 079, decision A2: the Combat Training maneuver of a parry against a further foe. */
  @Prop({ type: Object, required: false })
  parryManeuver?: ParryManeuver | null;
}
