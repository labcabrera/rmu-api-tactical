import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CharacterRoundEffect, CharacterRoundHP, CharacterRoundInitiative } from './character-round.models-childs';

export type CharacterRoundDocument = CharacterRoundModel & Document;

@Schema({ collection: 'character-rounds', versionKey: false })
export class CharacterRoundModel {
  @Prop({ required: true })
  gameId: string;

  @Prop({ required: true })
  characterId: string;

  @Prop({ required: true })
  round: number;

  @Prop({ type: CharacterRoundInitiative, required: true })
  initiative: CharacterRoundInitiative;

  @Prop({ required: true })
  actionPoints: number;

  @Prop({ type: CharacterRoundHP, required: true })
  hp: CharacterRoundHP;

  @Prop({ type: [CharacterRoundEffect], required: true })
  effects: CharacterRoundEffect[];

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date | undefined;
}

export const CharacterRoundSchema = SchemaFactory.createForClass(CharacterRoundModel);
