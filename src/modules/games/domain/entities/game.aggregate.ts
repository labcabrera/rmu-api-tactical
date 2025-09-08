import { randomUUID } from 'crypto';
import { NotModifiedError, ValidationError } from '../../../shared/domain/errors';
import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { GameCreatedEvent, GameRoundStartedEvent, GameUpdatedEvent } from '../events/game.events';
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

  update(name: string | undefined, description: string | undefined) {
    let changes = false;
    if (name && name !== this.name) {
      this.name = name;
      changes = true;
    }
    if (description && description !== this.description) {
      this.description = description;
      changes = true;
    }
    if (!changes) {
      throw new NotModifiedError('No changes detected');
    }
    this.updatedAt = new Date();
    this.addDomainEvent(new GameUpdatedEvent(this));
  }

  addFactions(factions: string[]) {
    if (factions.length === 0) {
      throw new ValidationError(`No factions provided`);
    }
    for (const faction of factions) {
      if (this.factions.includes(faction)) {
        throw new ValidationError(`Faction ${faction} already exists in the game`);
      }
    }
    this.factions.push(...factions);
    this.updatedAt = new Date();
    this.addDomainEvent(new GameUpdatedEvent(this));
  }

  deleteFactions(factions: string[]) {
    if (this.status !== 'created') {
      throw new ValidationError(`Cannot delete factions from a game that is not in 'created' status`);
    }
    if (factions.length === 0) {
      throw new ValidationError(`No factions provided`);
    }
    for (const faction of factions) {
      if (!this.factions.includes(faction)) {
        throw new ValidationError(`Faction ${faction} does not exist in the game`);
      }
    }
    this.factions = this.factions.filter((f) => !factions.includes(f));
    this.actors = this.actors.filter((a) => !factions.includes(a.factionId));
    this.updatedAt = new Date();
    this.addDomainEvent(new GameUpdatedEvent(this));
  }

  addActors(actors: Actor[]) {
    if (actors.length === 0) {
      throw new ValidationError(`No actors provided`);
    }
    for (const actor of actors) {
      if (this.actors.find((a) => a.id === actor.id && a.type === actor.type)) {
        throw new ValidationError(`Actor ${actor.id} already exists in the game`);
      }
      if (!this.factions.includes(actor.factionId)) {
        throw new ValidationError(`Actor ${actor.id} has faction ${actor.factionId} which is not part of the game`);
      }
    }
    this.actors.push(...actors);
    this.updatedAt = new Date();
    this.addDomainEvent(new GameUpdatedEvent(this));
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
