import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class RaceStatBonus {
  @Prop({ required: true })
  ag: number;

  @Prop({ required: true })
  co: number;

  @Prop({ required: true })
  em: number;

  @Prop({ required: true })
  in: number;

  @Prop({ required: true })
  me: number;

  @Prop({ required: true })
  pr: number;

  @Prop({ required: true })
  qu: number;

  @Prop({ required: true })
  re: number;

  @Prop({ required: true })
  sd: number;

  @Prop({ required: true })
  st: number;
}

@Schema({ _id: false })
export class RaceResistances {
  @Prop({ required: true })
  channeling: number;

  @Prop({ required: true })
  mentalism: number;

  @Prop({ required: true })
  essence: number;

  @Prop({ required: true })
  physical: number;
}

@Schema({ _id: false })
export class SexBasedAttribute {
  @Prop({ required: true })
  male: number;

  @Prop({ required: true })
  female: number;
}

export const RaceStatBonusSchema = SchemaFactory.createForClass(RaceStatBonus);
export const RaceResistancesSchema = SchemaFactory.createForClass(RaceResistances);
export const SexBasedAttributeSchema = SchemaFactory.createForClass(SexBasedAttribute);
