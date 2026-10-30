import type { ActorRoundItem } from '../../../domain/value-objects/actor-round-item.vo.js';
import type { ActorRoundActiveStyle, ActorRoundFightingStyle } from '../../../domain/value-objects/actor-round-fighting-style.vo.js';
import type { ActorRoundResistance } from '../../../domain/value-objects/actor-round-resistance.vo.js';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import type { Injury } from '../../../domain/value-objects/injury.vo.js';
import type { PoisonExposure } from '../../../domain/value-objects/poison.vo.js';
import { ActorRoundAlert } from './actor-round-alert.model.js';
import { ActorRoundAttack } from './actor-round-attack.model.js';
import { ActorRoundDefense } from './actor-round-defense.model.js';
import { ActorRoundHP } from './actor-round-hp.model.js';
import { ActorRoundInitiative } from './actor-round-initiative.model.js';
import { ActorRoundMovement } from './actor-round-movement.model.js';
import { ActorRoundPenalty } from './actor-round-penalty.model.js';
import { ActorRoundUsedBo } from './actor-round-used-bo.model.js';
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
} from './actor-round-childs.model.js';

export type ActorRoundDocument = HydratedDocument<ActorRoundModel>;

@Schema({ collection: 'actor-rounds', _id: false, versionKey: false })
export class ActorRoundModel {
  @Prop({ required: true })
  _id: string;

  /** Optimistic concurrency: +1 on each write. Documents stored before it existed have none (version 0). */
  @Prop({ type: Number, default: 0 })
  version: number;

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

  /** Workspace spec 042: poisons waiting for their RR (stored as documents of their own shape). */
  @Prop({ type: [Object], required: false, default: [] })
  poisonExposures?: PoisonExposure[];

  /** Spec 013, §1.1: the changes of the hits in this round. */
  @Prop({ type: [ActorRoundHpLogEntry], required: false, default: [] })
  hpLog?: ActorRoundHpLogEntry[];

  @Prop({ type: String, required: false })
  characterId?: string;

  /** Spec 055: the NPC an NPC actor is a specimen of. */
  @Prop({ type: String, required: false })
  npcId?: string;

  /** Spec 019: the items of the actor, with their modifiers (stored as documents of their own shape). */
  @Prop({ type: [Object], required: false, default: [] })
  items?: ActorRoundItem[];

  /** Workspace spec 022: resistance roll bonuses of the character. */
  @Prop({ type: [Object], required: false, default: [] })
  resistances?: ActorRoundResistance[];

  /** Workspace spec 032: fighting styles of the character and the one it fights with. */
  @Prop({ type: [Object], required: false, default: [] })
  fightingStyles?: ActorRoundFightingStyle[];

  @Prop({ type: Object, required: false, default: null })
  activeStyle?: ActorRoundActiveStyle | null;

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
