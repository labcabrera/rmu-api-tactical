import { AggregateRoot } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { NotModifiedError, ValidationError } from '../../../shared/domain/errors';
import { DomainEvent } from '../../../shared/domain/events/domain-event';
import {
  GameCreatedEvent,
  GamePhaseStartedEvent,
  GameRoundStartedEvent,
  GameUpdatedEvent,
} from '../events/game.events';
import { Actor } from '../value-objects/actor.vo';
import { GamePhase } from '../value-objects/game-phase.vo';
import { GameStatus } from '../value-objects/game-status.vo';

export type GameProps = {
  id: string;
  strategicGameId: string;
  name: string;
  status: GameStatus;
  round: number;
  phase: GamePhase;
  factions: string[];
  actors: Actor[];
  description?: string;
  owner: string;
  createdAt: Date;
  updatedAt?: Date;
};

export class Game extends AggregateRoot<DomainEvent<Game>> {
  private static readonly phaseTransitions: Map<GamePhase, GamePhase> = new Map([
    ['declare_initiative', 'phase_1'],
    ['phase_1', 'phase_2'],
    ['phase_2', 'phase_3'],
    ['phase_3', 'phase_4'],
    ['phase_4', 'upkeep'],
  ]);

  private constructor(
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
  ) {
    super();
  }

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
    game.apply(new GameCreatedEvent(game));
    return game;
  }

  static fromProps(props: GameProps) {
    return new Game(
      props.id,
      props.strategicGameId,
      props.name,
      props.status,
      props.round,
      props.phase,
      props.factions,
      props.actors,
      props.description,
      props.owner,
      props.createdAt,
      props.updatedAt,
    );
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
    this.apply(new GameUpdatedEvent(this));
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
    this.apply(new GameUpdatedEvent(this));
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
    this.actors = this.actors.filter((a) => !factions.includes(a.faction.id));
    this.updatedAt = new Date();
    this.apply(new GameUpdatedEvent(this));
  }

  addActors(actors: Actor[]) {
    if (actors.length === 0) {
      throw new ValidationError(`No actors provided`);
    }
    for (const actor of actors) {
      if (this.actors.find((a) => a.id === actor.id && a.type === actor.type)) {
        throw new ValidationError(`Actor ${actor.id} already exists in the game`);
      }
      if (!this.factions.includes(actor.faction.id)) {
        throw new ValidationError(`Actor ${actor.id} has faction ${actor.faction.id} which is not part of the game`);
      }
    }
    this.actors.push(...actors);
    this.updatedAt = new Date();
    this.apply(new GameUpdatedEvent(this));
  }

  deleteActors(ids: string[]) {
    if (this.status !== 'created') {
      throw new ValidationError(`Cannot delete actors from a game that is not in 'created' status`);
    }
    ids.forEach((id) => {
      const index = this.actors.findIndex((a) => a.id === id);
      if (index === -1) {
        throw new ValidationError(`Actor ${id} does not exist in the game`);
      }
      this.actors.splice(index, 1);
    });
    this.updatedAt = new Date();
    this.apply(new GameUpdatedEvent(this));
  }

  startRound() {
    this.status = 'in_progress';
    this.phase = 'declare_initiative';
    this.round += 1;
    this.apply(new GameRoundStartedEvent(this));
    this.updatedAt = new Date();
  }

  startPhase() {
    if (!Game.phaseTransitions.has(this.phase)) {
      throw new ValidationError(`Cannot start next phase from phase ${this.phase}`);
    }
    this.phase = Game.phaseTransitions.get(this.phase)!;
    this.apply(new GamePhaseStartedEvent(this));
    this.updatedAt = new Date();
  }

  getActionPhase(): number {
    this.checkValidActionManagement();
    return parseInt(this.phase.replace('phase_', ''));
  }

  checkValidActionManagement() {
    if (this.status !== 'in_progress') {
      throw new ValidationError('Game is not in progress');
    }
    if (!['phase_1', 'phase_2', 'phase_3', 'phase_4'].includes(this.phase)) {
      throw new ValidationError('Game is not in a phase that allows action management');
    }
  }

  toProps(): GameProps {
    return {
      id: this.id,
      strategicGameId: this.strategicGameId,
      name: this.name,
      status: this.status,
      round: this.round,
      phase: this.phase,
      factions: this.factions,
      actors: this.actors,
      description: this.description,
      owner: this.owner,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
