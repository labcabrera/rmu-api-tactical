import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { RaceResistances, RaceStatBonus, SexBasedAttribute } from './race-model-childs';

export type RaceDocument = RaceModel & Document;

@Schema({ collection: 'races', versionKey: false })
export class RaceModel {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  realm: string;

  @Prop({ required: true })
  size: string;

  @Prop({ type: RaceStatBonus, required: true })
  defaultStatBonus: RaceStatBonus;

  @Prop({ type: RaceResistances, required: true })
  resistances: RaceResistances;

  @Prop({ type: SexBasedAttribute, required: true })
  averageHeight: SexBasedAttribute;

  @Prop({ type: SexBasedAttribute, required: true })
  averageWeight: SexBasedAttribute;

  @Prop({ required: true })
  strideBonus: number;

  @Prop({ required: true })
  enduranceBonus: number;

  @Prop({ required: true })
  recoveryMultiplier: number;

  @Prop({ required: true })
  baseHits: number;

  @Prop({ required: true })
  bonusDevPoints: number;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: false })
  updatedAt?: Date;
}

export const RaceSchema = SchemaFactory.createForClass(RaceModel);
