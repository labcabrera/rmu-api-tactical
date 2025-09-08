import { randomUUID } from 'crypto';
import { ValidationError } from '../../../shared/domain/errors';
import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { GameCreatedEvent, GameRoundStartedEvent } from '../events/game-events';
import { Actor } from './actor.vo';
import { GamePhase } from './game-phase.vo';
import { GameStatus } from './game-status.vo';

export class Game {
  private static readonly phaseTransitions: Map<GamePhase, GamePhase> = new Map([
    ['declare_initiative', 'phase_1'],
    ['phase_1', 'phase_2'],
    ['phase_2', 'phase_3'],
    ['phase_3', 'phase_4'],
    ['phase_4', 'upkeep'],
  ]);

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

  static create(
    strategicGameId: string,
    name: string,
    factions: string[] | undefined,
    actors: Actor[] | undefined,
    description: string | undefined,
    owner: string,
  ) {
    const game = new Game(
      randomUUID(),
      strategicGameId,
      name,
      'created',
      0,
      'not_started',
      factions || [],
      actors || [],
      description,
      owner,
      new Date(),
      undefined,
    );
    game.addDomainEvent(new GameCreatedEvent(game));
    return game;
  }

  startRound() {
    this.status = 'in_progress';
    this.phase = 'declare_initiative';
    this.round += 1;
    this.addDomainEvent(new GameRoundStartedEvent(this));
    this.updatedAt = new Date();
  }

  startPhase() {
    if (!Game.phaseTransitions.has(this.phase)) {
      throw new ValidationError(`Cannot start next phase from phase ${this.phase}`);
    }
    this.phase = Game.phaseTransitions.get(this.phase)!;
    this.addDomainEvent(new GameRoundStartedEvent(this));
    this.updatedAt = new Date();
  }

  /**
   * Convert the Game entity to a plain object suitable for persistence,
   * excluding domain events.
   */
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
