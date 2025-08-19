import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GameDocument = GameModel & Document;

@Schema({ collection: 'tactical-games', versionKey: false })
export class GameModel {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  factions: string[];

  @Prop({ required: true })
  status: 'created' | 'in_progress' | 'finished';

  @Prop({ required: true })
  round: number;

  @Prop({ required: true })
  phase: 'not_started' | 'declare_actions' | 'declare_initative' | 'resolve_actions' | 'upkeep';

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
