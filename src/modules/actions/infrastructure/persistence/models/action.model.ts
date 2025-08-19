import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import * as actionEntity from '../../../domain/entities/action.entity';
import { ActionAttack, ActionManeuver } from './action.model-childs';

export type ActionDocument = ActionModel & Document;

@Schema({ collection: 'actions', versionKey: false })
export class ActionModel {
  @Prop({ required: true })
  gameId: string;

  @Prop({ required: true })
  characterId: string;

  @Prop({ required: true })
  status: actionEntity.ActionStatus;

  @Prop({ required: true })
  round: number;

  @Prop({ required: true })
  actionType: actionEntity.ActionType;

  @Prop({ required: true })
  phaseStart: number;

  @Prop({ required: true })
  actionPoints: number;

  @Prop({ type: [ActionAttack], required: false })
  attacks: ActionAttack[] | undefined;

  @Prop({ type: ActionManeuver, required: false })
  maneuver: ActionManeuver | undefined;

  description: string | undefined;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date | undefined;
}

export const ActionSchema = SchemaFactory.createForClass(ActionModel);
