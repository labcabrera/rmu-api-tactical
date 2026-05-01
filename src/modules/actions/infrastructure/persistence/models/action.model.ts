import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import type { ActionStatus } from '../../../domain/value-objects/action-status.vo';
import type { ActionType } from '../../../domain/value-objects/action-type.vo';
import { ActionAttack } from './action-attack.model';
import { ActionManeuver } from './action-maneuver.model';
import { ActionMovement } from './action-movement.model';
import { ActionParry } from './action-parry.model';

export type ActionDocument = ActionModel & Document;

@Schema({ collection: 'actions', _id: false, versionKey: false })
export class ActionModel {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  gameId: string;

  @Prop({ required: true })
  actorId: string;

  @Prop({ required: true })
  status: ActionStatus;

  @Prop({ required: true })
  round: number;

  @Prop({ required: true })
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

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date | null;
}

export const ActionSchema = SchemaFactory.createForClass(ActionModel);
