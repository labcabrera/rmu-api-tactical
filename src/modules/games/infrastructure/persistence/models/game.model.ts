import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as gamePhaseVo from '../../../domain/entities/game-phase.vo';
import * as gameStatusVo from '../../../domain/entities/game-status.vo';
import { Actor } from './game.model-childs';

export type GameDocument = GameModel & Document;

@Schema({ collection: 'tactical-games', versionKey: false })
export class GameModel {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  strategicGameId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  status: gameStatusVo.GameStatus;

  @Prop({ required: true })
  round: number;

  @Prop({ required: true })
  phase: gamePhaseVo.GamePhase;

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
