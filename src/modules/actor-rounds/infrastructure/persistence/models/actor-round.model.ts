import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ActorRoundAttack } from './actor-round-attack.model';
import { ActorRoundDefense } from './actor-round-defense.model';
import {
  ActorRoundEffect,
  ActorRoundFatigue,
  ActorRoundHP,
  ActorRoundInitiative,
  ActorRoundParry,
  ActorRoundPenalty,
} from './actor-round.models-childs';

export type ActorRoundDocument = ActorRoundModel & Document;

@Schema({ collection: 'actor-rounds', _id: false, versionKey: false })
export class ActorRoundModel {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  gameId: string;

  @Prop({ required: true })
  actorId: string;

  @Prop({ required: true })
  actorName: string;

  @Prop({ required: true })
  round: number;

  @Prop({ type: ActorRoundInitiative, required: true })
  initiative: ActorRoundInitiative;

  @Prop({ required: true })
  actionPoints: number;

  @Prop({ type: ActorRoundHP, required: true })
  hp: ActorRoundHP;

  @Prop({ type: ActorRoundFatigue, required: true })
  fatigue: ActorRoundFatigue;

  @Prop({ type: [ActorRoundPenalty], required: true })
  penalties: ActorRoundPenalty[];

  @Prop({ type: ActorRoundDefense, required: true })
  defense: ActorRoundDefense;

  @Prop({ type: [ActorRoundAttack], required: true })
  attacks: ActorRoundAttack[];

  @Prop({ type: [ActorRoundParry], required: true })
  parries: ActorRoundParry[];

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
