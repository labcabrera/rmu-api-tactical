import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import {
  CharacterDefense,
  CharacterEndurance,
  CharacterEquipment,
  CharacterHP,
  CharacterInfo,
  CharacterInitiative,
  CharacterItem,
  CharacterMovement,
  CharacterPower,
  CharacterSkill,
  CharacterStatistics,
} from './character.model-childs';

export type CharacterDocument = CharacterModel & Document;

@Schema({ collection: 'tactical-characters', versionKey: false })
export class CharacterModel {
  @Prop({ required: true })
  gameId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  faction: string;

  @Prop({ type: CharacterInfo, required: true })
  info: CharacterInfo;

  @Prop({ type: CharacterStatistics, required: true })
  statistics: CharacterStatistics;

  @Prop({ type: CharacterMovement, required: true })
  movement: CharacterMovement;

  @Prop({ type: CharacterDefense, required: true })
  defense: CharacterDefense;

  @Prop({ type: CharacterEndurance, required: true })
  endurance: CharacterEndurance;

  @Prop({ type: CharacterHP, required: true })
  hp: CharacterHP;

  power: CharacterPower | undefined;

  @Prop({ type: CharacterInitiative, required: true })
  initiative: CharacterInitiative;

  @Prop({ type: [CharacterSkill], required: true })
  skills: CharacterSkill[];

  @Prop({ type: [CharacterItem], required: true })
  items: CharacterItem[];

  @Prop({ type: CharacterEquipment, required: true })
  equipment: CharacterEquipment;

  status: string | undefined;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: false })
  updatedAt?: Date;
}

export const CharacterSchema = SchemaFactory.createForClass(CharacterModel);
