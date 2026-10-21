import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { Injury } from '../../../domain/value-objets/injury.vo';
import { ActorRoundAlert } from './actor-round-alert.model';
import { ActorRoundAttack } from './actor-round-attack.model';
import { ActorRoundDefense } from './actor-round-defense.model';
import { ActorRoundHP } from './actor-round-hp.model';
import { ActorRoundInitiative } from './actor-round-initiative.model';
import { ActorRoundMovement } from './actor-round-movement.model';
import { ActorRoundPenalty } from './actor-round-penalty.model';
import { ActorRoundUsedBo } from './actor-round-used-bo.model';
import {
  ActorRoundApLedgerEntry,
  ActorRoundApModifier,
  ActorRoundDefenseMode,
  ActorRoundEffect,
  ActorRoundFatigue,
  ActorRoundHpLogEntry,
  ActorRoundPhaseLog,
  ActorRoundSnapshot,
  ActorRoundTrait,
} from './actor-round.models-childs';

export type ActorRoundDocument = ActorRoundModel & Document;

@Schema({ collection: 'actor-rounds', _id: false, versionKey: false })
export class ActorRoundModel {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  gameId: string;

  @Prop({ required: true })
  actorType: string;

  @Prop({ required: true })
  actorId: string;

  @Prop({ required: true })
  actorName: string;

  @Prop({ type: ActorRoundMovement, required: true })
  movement: ActorRoundMovement;

  @Prop({ type: Number, required: false })
  size: number;

  @Prop({ required: false })
  raceName: string;

  @Prop({ required: false })
  level: number;

  @Prop({ required: true })
  factionId: string;

  @Prop({ required: true })
  round: number;

  @Prop({ type: ActorRoundInitiative, required: true })
  initiative: ActorRoundInitiative;

  @Prop({ type: Number, required: true })
  actionPoints: number;

  @Prop({ type: ActorRoundHP, required: true })
  hp: ActorRoundHP;

  @Prop({ type: ActorRoundFatigue, required: true })
  fatigue: ActorRoundFatigue;

  @Prop({ type: ActorRoundPenalty, required: true })
  penalty: ActorRoundPenalty;

  @Prop({ type: ActorRoundDefense, required: true })
  defense: ActorRoundDefense;

  @Prop({ type: [ActorRoundAttack], required: true })
  attacks: ActorRoundAttack[];

  @Prop({ type: [ActorRoundUsedBo], required: true })
  usedBo: ActorRoundUsedBo[];

  @Prop({ type: [Number], required: true })
  parries: number[];

  @Prop({ type: [ActorRoundEffect], required: true })
  effects: ActorRoundEffect[];

  @Prop({ type: [ActorRoundAlert], required: true })
  alerts: ActorRoundAlert[];

  @Prop({ type: [ActorRoundTrait], required: false, default: [] })
  traits?: ActorRoundTrait[];

  @Prop({ type: ActorRoundDefenseMode, required: false })
  defenseMode?: ActorRoundDefenseMode;

  @Prop({ type: [ActorRoundPhaseLog], required: false, default: [] })
  phaseLog?: ActorRoundPhaseLog[];

  @Prop({ type: [ActorRoundApModifier], required: false, default: [] })
  apModifiers?: ActorRoundApModifier[];

  @Prop({ type: [Number], required: false, default: [] })
  apCapacity?: number[];

  @Prop({ type: [ActorRoundApLedgerEntry], required: false, default: [] })
  apLedger?: ActorRoundApLedgerEntry[];

  /** Spec 013, §1: injuries as the shared model (stored as documents of their own shape). */
  @Prop({ type: [Object], required: false, default: [] })
  injuries?: Injury[];

  /** Spec 013, §1.1: the changes of the hits in this round. */
  @Prop({ type: [ActorRoundHpLogEntry], required: false, default: [] })
  hpLog?: ActorRoundHpLogEntry[];

  @Prop({ type: String, required: false })
  characterId?: string;

  @Prop({ type: ActorRoundSnapshot, required: false })
  snapshot?: ActorRoundSnapshot;

  @Prop({ type: String, required: false })
  imageUrl: string | undefined;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date | null;
}

export const ActorRoundSchema = SchemaFactory.createForClass(ActorRoundModel);
