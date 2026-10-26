import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

import type { ActionStatus } from '../../../domain/value-objects/action-status.vo.js';
import type { ActionType } from '../../../domain/value-objects/action-type.vo.js';
import type { ActionSpell } from '../../../domain/value-objects/action-spell.vo.js';
import { ActionAttack } from './action-attack.model.js';
import { ActionManeuver } from './action-maneuver.model.js';
import { ActionMovement } from './action-movement.model.js';
import { ActionParry } from './action-parry.model.js';
import { ActionApRangeModel, ActionResolutionModel } from './action-resolution.model.js';

export type ActionDocument = HydratedDocument<ActionModel>;

@Schema({ collection: 'actions', _id: false, versionKey: false })
export class ActionModel {
  @Prop({ required: true })
  _id: string;

  /** Optimistic concurrency: +1 on each write. Documents stored before it existed have none (version 0). */
  @Prop({ type: Number, default: 0 })
  version: number;

  @Prop({ required: true })
  gameId: string;

  @Prop({ required: true })
  actorId: string;

  @Prop({ type: String, required: true })
  status: ActionStatus;

  @Prop({ required: true })
  round: number;

  @Prop({ type: String, required: true })
  actionType: ActionType;

  @Prop({ required: true })
  freeAction: boolean;

  @Prop({ required: true })
  phaseStart: number;

  @Prop({ type: Number, required: false })
  phaseEnd: number | null;

  @Prop({ type: Number, required: false })
  actionPoints: number | null;

  @Prop({ type: ActionMovement, required: false })
  movement: ActionMovement | null;

  @Prop({ type: ActionManeuver, required: false })
  maneuver: ActionManeuver | null;

  @Prop({ type: [ActionAttack], required: false })
  attacks: ActionAttack[] | null;

  @Prop({ type: [ActionParry], required: false })
  public parries: ActionParry[] | null;

  @Prop({ type: Number, required: false })
  fatigue: number | null;

  @Prop({ type: String, required: false })
  description: string | null;

  @Prop({ type: ActionResolutionModel, required: false })
  resolution?: ActionResolutionModel | null;

  @Prop({ type: ActionApRangeModel, required: false })
  apRange?: ActionApRangeModel | null;

  @Prop({ type: String, required: false })
  continuesActionId?: string | null;

  @Prop({ type: Number, required: false })
  carriedAp?: number | null;

  /** Spec 030: the spell of a `cast_spell` action, stored as the domain value object. */
  @Prop({ type: Object, required: false })
  spell?: ActionSpell | null;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date | null;
}

export const ActionSchema = SchemaFactory.createForClass(ActionModel);
