import { randomUUID } from 'crypto';
import { Game } from '../../../games/domain/entities/game.aggregate';
import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { ActorRoundAttack } from '../../infrastructure/persistence/models/actor-round-attack.model';
import { ActorRoundCreatedEvent } from '../events/actor-round.events';
import { ActorRoundEffect } from './actor-round-effect.vo';
import { ActorRoundFatigue } from './actor-round-fatigue.vo';
import { ActorRoundHP } from './actor-round-hp.vo';
import { ActorRoundInitiative } from './actor-round-initiative.vo';
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

  private domainEvents: DomainEvent<ActorRound>[] = [];

  static create(
    game: Game,
    actorId: string,
    actorName: string,
    initiative: ActorRoundInitiative,
    actionPoints: number,
    hp: ActorRoundHP,
    fatigue: ActorRoundFatigue,
    penalties: ActorRoundPenalty[],
    attacks: ActorRoundAttack[],
    effects: ActorRoundEffect[],
    owner: string,
  ): ActorRound {
    const actorRound = new ActorRound(
      randomUUID(),
      game.id,
      actorId,
      actorName,
      game.round,
      initiative,
      actionPoints,
      hp,
      fatigue,
      penalties,
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

  toPersistence(): any {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { domainEvents, ...rest } = this;
    return { ...rest };
  }

  addDomainEvent(event: DomainEvent<ActorRound>) {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent<ActorRound>[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }
}
