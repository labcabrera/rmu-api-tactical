import { randomUUID } from 'crypto';
import { AggregateRoot } from '../../../shared/domain/entities/aggregate-root';
import { ActorRoundAttack } from '../../infrastructure/persistence/models/actor-round-attack.model';
import { ActorRoundCreatedEvent } from '../events/actor-round.events';
import { ActorRoundDefense } from './actor-round-defense.vo';
import { ActorRoundEffect } from './actor-round-effect.vo';
import { ActorRoundFatigue } from './actor-round-fatigue.vo';
import { ActorRoundHP } from './actor-round-hp.vo';
import { ActorRoundInitiative } from './actor-round-initiative.vo';
import { ActorRoundParry } from './actor-round-parry.vo';
import { ActorRoundPenalty } from './actor-round-penalty.vo';

export class ActorRound extends AggregateRoot<ActorRound> {
  constructor(
    public readonly id: string,
    public readonly gameId: string,
    public readonly round: number,
    public readonly actorId: string,
    public readonly actorName: string,
    public readonly initiative: ActorRoundInitiative,
    public readonly actionPoints: number,
    public hp: ActorRoundHP,
    public fatigue: ActorRoundFatigue,
    public penalties: ActorRoundPenalty[],
    public defense: ActorRoundDefense,
    public attacks: ActorRoundAttack[],
    public parries: ActorRoundParry[],
    public effects: ActorRoundEffect[],
    public owner: string,
    public readonly createdAt: Date,
    public updatedAt: Date | undefined,
  ) {
    super();
  }

  static create(
    gameId: string,
    round: number,
    actorId: string,
    actorName: string,
    initiative: ActorRoundInitiative,
    actionPoints: number,
    hp: ActorRoundHP,
    fatigue: ActorRoundFatigue,
    penalties: ActorRoundPenalty[],
    defense: ActorRoundDefense,
    attacks: ActorRoundAttack[],
    effects: ActorRoundEffect[],
    owner: string,
  ): ActorRound {
    const actorRound = new ActorRound(
      randomUUID(),
      gameId,
      round,
      actorId,
      actorName,
      initiative,
      actionPoints,
      hp,
      fatigue,
      penalties,
      defense,
      attacks,
      [],
      effects,
      owner,
      new Date(),
      undefined,
    );
    actorRound.addDomainEvent(new ActorRoundCreatedEvent(actorRound));
    return actorRound;
  }

  static createFromPrevious(previous: ActorRound): ActorRound {
    const { gameId, round, actorId, actorName, initiative, hp, fatigue, penalties, defense, attacks, effects, owner } = previous;
    const actorRound = new ActorRound(
      randomUUID(),
      gameId,
      round + 1,
      actorId,
      actorName,
      new ActorRoundInitiative(initiative.base, initiative.penalty, undefined, undefined),
      4,
      hp,
      fatigue,
      penalties,
      defense,
      attacks,
      [],
      effects,
      owner,
      new Date(),
      undefined,
    );
    actorRound.attacks.forEach((attack) => {
      attack.currentBo = attack.baseBo;
    });
    actorRound.addDomainEvent(new ActorRoundCreatedEvent(actorRound));
    return actorRound;
  }
}
