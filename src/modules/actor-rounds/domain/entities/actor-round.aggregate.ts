import { ActorRoundAttack } from '../../infrastructure/persistence/models/actor-round-attack.model';
import { ActorRoundEffect } from './actor-round-effect.vo';
import { ActorRoundFatigue } from './actor-round-fatigue.vo';
import { ActorRoundHP } from './actor-round-hp.vo';
import { ActorRoundParry } from './actor-round-parry.vo';
import { ActorRoundPenalty } from './actor-round-penalty.vo';

export class ActorRound {
  constructor(
    public readonly id: string,
    public readonly gameId: string,
    public readonly actorId: string,
    public readonly actorName: string,
    public readonly round: number,
    public readonly initiative: ActorRoundInitiative,
    public readonly actionPoints: number,
    public hp: ActorRoundHP,
    public fatigue: ActorRoundFatigue,
    public penalties: ActorRoundPenalty[],
    public attacks: ActorRoundAttack[],
    public parries: ActorRoundParry[],
    public effects: ActorRoundEffect[],
    public owner: string,
    public readonly createdAt: Date,
    public updatedAt: Date | undefined,
  ) {}
}

export interface ActorRoundInitiative {
  base: number;
  penalty: number;
  roll: number | undefined;
  total: number | undefined;
}
