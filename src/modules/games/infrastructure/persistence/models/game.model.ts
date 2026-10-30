import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import type { GamePhase } from '../../../domain/value-objects/game-phase.vo.js';
import type { GameStatus } from '../../../domain/value-objects/game-status.vo.js';
import type { EnvironmentFaction } from '../../../domain/value-objects/environment-faction.vo.js';
import type { TacticalGameOutcome } from '../../../domain/value-objects/tactical-game-outcome.vo.js';
import { Actor, GameEnvironment } from './game-childs.model.js';

export type GameDocument = HydratedDocument<GameModel>;

@Schema({ collection: 'tactical-games', _id: false, versionKey: false })
export class GameModel {
  @Prop({ required: true })
  _id: string;

  /** Optimistic concurrency: +1 on each write. Documents stored before it existed have none (version 0). */
  @Prop({ type: Number, default: 0 })
  version: number;

  @Prop({ required: true })
  strategicGameId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, required: true })
  status: GameStatus;

  @Prop({ required: true })
  round: number;

  @Prop({ type: String, required: true })
  phase: GamePhase;

  @Prop({ required: true })
  factions: string[];

  @Prop({ type: [Actor], required: true })
  actors: Actor[];

  @Prop({ type: GameEnvironment, required: false })
  environment?: GameEnvironment;

  /** Spec 055: the environment faction, `{factionId, name, npcs}`. Missing in games without one. */
  @Prop({ type: Object, required: false })
  environmentFaction?: EnvironmentFaction | null;

  @Prop({ required: false })
  description: string;

  @Prop({ required: false })
  imageUrl?: string;

  @Prop({ required: true })
  owner: string;

  /** Spec 021: owner of the strategic game, who also manages this one. */
  @Prop({ required: false })
  strategicGameOwner?: string;

  /** Spec 021: accessType of the strategic game. Missing means private. */
  @Prop({ required: false })
  accessType?: string;

  /** Spec 013: set when the game is finished. */
  @Prop({ type: Object, required: false })
  outcome?: TacticalGameOutcome;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: false })
  updatedAt?: Date;
}

export const GameSchema = SchemaFactory.createForClass(GameModel);
