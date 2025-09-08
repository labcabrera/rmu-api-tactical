import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { GameRoundStartedEvent } from '../events/game-events';
import { Actor } from './actor.vo';
import { GamePhase } from './game-phase.vo';
import { GameStatus } from './game-status.vo';

export class Game {
  private domainEvents: DomainEvent<Game>[] = [];

  constructor(
    public readonly id: string,
    public readonly strategicGameId: string,
    public name: string,
    public status: GameStatus,
    public round: number,
    public phase: GamePhase,
    public factions: string[],
    public actors: Actor[],
    public description: string | undefined,
    public owner: string,
    public readonly createdAt: Date,
    public updatedAt: Date | undefined,
  ) {}

  startRound() {
    this.status = 'in_progress';
    this.phase = 'declare_initiative';
    this.round += 1;
    this.addDomainEvent(new GameRoundStartedEvent(this));
    this.updatedAt = new Date();
  }

  toPersistence(): any {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { domainEvents, ...rest } = this;
    return { ...rest };
  }

  addDomainEvent(event: DomainEvent<Game>) {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent<Game>[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }
}
