import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { GameStartedEvent } from '../events/game-events';
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

  // Ejemplo de método de dominio
  startGame() {
    if (this.status !== 'created') {
      throw new Error('Game already started or finished');
    }
    this.status = 'in_progress';
    this.phase = 'declare_initiative';
    this.addDomainEvent(new GameStartedEvent(this));
    this.updatedAt = new Date();
  }

  addDomainEvent(event: DomainEvent<Game>) {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent<Game>[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }

  // Otros métodos de dominio según tu lógica...
}
