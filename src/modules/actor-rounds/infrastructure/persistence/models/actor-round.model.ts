import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ActorRoundEffect, ActorRoundHP, ActorRoundInitiative } from './actor-round.models-childs';

export type ActorRoundDocument = ActorRoundModel & Document;

@Schema({ collection: 'actor-rounds', versionKey: false })
export class ActorRoundModel {
  @Prop({ required: true })
  gameId: string;

  @Prop({ required: true })
  actorId: string;

  @Prop({ required: true })
  round: number;

  @Prop({ type: ActorRoundInitiative, required: true })
  initiative: ActorRoundInitiative;

  @Prop({ required: true })
  actionPoints: number;

  @Prop({ type: ActorRoundHP, required: true })
  hp: ActorRoundHP;

  @Prop({ type: [ActorRoundEffect], required: true })
  effects: ActorRoundEffect[];

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date | undefined;
}

export const ActorRoundSchema = SchemaFactory.createForClass(ActorRoundModel);
