import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as gameEntity from '../../../domain/entities/game.entity';
import { Actor } from './game.model-childs';

export type GameDocument = GameModel & Document;

@Schema({ collection: 'tactical-games', versionKey: false })
export class GameModel {
  @Prop({ required: true })
  strategicGameId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  status: gameEntity.GameStatus;

  @Prop({ required: true })
  round: number;

  @Prop({ required: true })
  phase: gameEntity.GamePhase;

  @Prop({ required: true })
  factions: string[];

  @Prop({ type: [Actor], required: true })
  actors: Actor[];

  @Prop({ required: false })
  description: string;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: false })
  updatedAt?: Date;
}

export const GameSchema = SchemaFactory.createForClass(GameModel);
