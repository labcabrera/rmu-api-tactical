import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { ActionAttack, ActionAttackInfo, ActionResult } from '../../../domain/entities/action.entity';

export type ActionDocument = ActionModel & Document;

@Schema({ collection: 'actions', versionKey: false })
export class ActionModel {
  @Prop({ required: true })
  gameId: string;

  @Prop({ required: true })
  characterId: string;

  @Prop({ required: true })
  round: number;

  @Prop({ required: true })
  actionType: string;

  @Prop({ required: true })
  phaseStart: number;

  @Prop({ required: true })
  actionPoints: number;

  attackInfo: ActionAttackInfo | undefined;

  attacks: ActionAttack[] | undefined;

  description: string | undefined;

  result: ActionResult | undefined;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date | undefined;
}

export const ActionSchema = SchemaFactory.createForClass(ActionModel);
