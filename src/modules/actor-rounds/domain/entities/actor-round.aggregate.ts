import { ActorRoundAttack } from './actor-round-attack.vo';
import { ActorRoundEffect } from './actor-round-effect.vo';
import { ActorRoundFatigue } from './actor-round-fatigue.vo';
import { ActorRoundHP } from './actor-round-hp.vo';
import { ActorRoundPenalty } from './actor-round-penalty.vo';

export interface ActorRound {
  id: string;
  gameId: string;
  actorId: string;
  actorName: string;
  round: number;
  initiative: ActorRoundInitiative;
  actionPoints: number;
  hp: ActorRoundHP;
  fatigue: ActorRoundFatigue;
  penalties: ActorRoundPenalty[];
  attacks: ActorRoundAttack[];
  parries: ActorRoundParry[];
  effects: ActorRoundEffect[];
  owner: string;
  createdAt: Date;
  updatedAt: Date | undefined;
}

export interface ActorRoundParry {
  attackName: string;
  parryValue: number;
}

export interface ActorRoundInitiative {
  base: number;
  penalty: number;
  roll: number | undefined;
  total: number | undefined;
}
