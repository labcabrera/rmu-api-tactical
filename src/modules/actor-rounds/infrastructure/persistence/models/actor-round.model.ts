import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ActorRoundAlert } from './actor-round-alert.model';
import { ActorRoundAttack } from './actor-round-attack.model';
import { ActorRoundDefense } from './actor-round-defense.model';
import { ActorRoundHP } from './actor-round-hp.model';
import { ActorRoundPenalty } from './actor-round-penalty.model';
import { ActorRoundUsedBo } from './actor-round-used-bo.model';
import {
  ActorRoundEffect,
  ActorRoundFaction,
  ActorRoundFatigue,
  ActorRoundInitiative,
} from './actor-round.models-childs';

export type ActorRoundDocument = ActorRoundModel & Document;

@Schema({ collection: 'actor-rounds', _id: false, versionKey: false })
export class ActorRoundModel {
  constructor(
    _id: string,
    gameId: string,
    actorId: string,
    actorName: string,
    raceName: string,
    level: number,
    faction: ActorRoundFaction,
    round: number,
    initiative: ActorRoundInitiative,
    actionPoints: number,
    hp: ActorRoundHP,
    fatigue: ActorRoundFatigue,
    penalty: ActorRoundPenalty,
    defense: ActorRoundDefense,
    attacks: ActorRoundAttack[],
    usedBo: ActorRoundUsedBo[],
    parries: number[],
    effects: ActorRoundEffect[],
    alerts: ActorRoundAlert[],
    imageUrl: string | undefined,
    owner: string,
    createdAt: Date,
    updatedAt?: Date,
  ) {
    this._id = _id;
    this.gameId = gameId;
    this.actorId = actorId;
    this.actorName = actorName;
    this.raceName = raceName;
    this.level = level;
    this.faction = faction;
    this.round = round;
    this.initiative = initiative;
    this.actionPoints = actionPoints;
    this.hp = hp;
    this.fatigue = fatigue;
    this.penalty = penalty;
    this.defense = defense;
    this.attacks = attacks;
    this.usedBo = usedBo;
    this.parries = parries;
    this.effects = effects;
    this.alerts = alerts;
    this.imageUrl = imageUrl;
    this.owner = owner;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  gameId: string;

  @Prop({ required: true })
  actorId: string;

  @Prop({ required: true })
  actorName: string;

  @Prop({ required: false })
  raceName: string;

  @Prop({ required: false })
  level: number;

  @Prop({ required: true })
  faction: ActorRoundFaction;

  @Prop({ required: true })
  round: number;

  @Prop({ type: ActorRoundInitiative, required: true })
  initiative: ActorRoundInitiative;

  @Prop({ required: true })
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

  @Prop({ type: String, required: false })
  imageUrl: string | undefined;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date | undefined;
}

export const ActorRoundSchema = SchemaFactory.createForClass(ActorRoundModel);
