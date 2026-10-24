import { randomUUID } from 'crypto';
import { BaseAggregateRoot } from '../../../shared/domain/aggregates/base-aggregate.js';
import { ConflictError, ValidationError } from '../../../shared/domain/errors/errors.js';
import {
  GameAppliedEvent,
  GameCreatedEvent,
  GameFinishedEvent,
  GamePhaseStartedEvent,
  GameRoundStartedEvent,
  GameUpdatedEvent,
} from '../events/game.events.js';
import { Actor } from '../value-objects/actor.vo.js';
import { GameEnvironment } from '../value-objects/game-environment.vo.js';
import type { GamePhase } from '../value-objects/game-phase.vo.js';
import type { GameStatus } from '../value-objects/game-status.vo.js';
import type { TacticalGameOutcome, TacticalGameOutcomeCharacter } from '../value-objects/tactical-game-outcome.vo.js';
import type { GameProps } from './game-props.js';

export class Game extends BaseAggregateRoot<GameProps> {
  private static readonly phaseTransitions: Map<GamePhase, GamePhase> = new Map([
    ['declare_initiative', 'phase_1'],
    ['phase_1', 'phase_2'],
    ['phase_2', 'phase_3'],
    ['phase_3', 'phase_4'],
    ['phase_4', 'upkeep'],
  ]);

  private constructor(
    id: string,
    public readonly strategicGameId: string,
    public name: string,
    public status: GameStatus,
    public round: number,
    public phase: GamePhase,
    public factions: string[],
    public actors: Actor[],
    public environment: GameEnvironment | undefined,
    public description: string | undefined,
    public imageUrl: string | undefined,
    public owner: string,
    public readonly createdAt: Date,
    public updatedAt: Date | undefined,
  ) {
    super(id);
  }

  /** Set when the game is finished (spec 013, §3). */
  public outcome: TacticalGameOutcome | undefined;

  static create(
    strategicGameId: string,
    name: string,
    factions: string[] | undefined,
    actors: Actor[] | undefined,
    environment: GameEnvironment | undefined,
    description: string | undefined,
    imageUrl: string | undefined,
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
      environment,
      description,
      imageUrl,
      owner,
      new Date(),
      undefined,
    );
    game.apply(new GameCreatedEvent(game));
    return game;
  }

  static fromProps(props: GameProps) {
    const game = new Game(
      props.id,
      props.strategicGameId,
      props.name,
      props.status,
      props.round,
      props.phase,
      props.factions,
      props.actors,
      props.environment,
      props.description,
      props.imageUrl,
      props.owner,
      props.createdAt,
      props.updatedAt,
    );
    game.outcome = props.outcome;
    return game;
  }

  isFinished(): boolean {
    return this.status === 'finished';
  }

  /** A finished game only takes reads and `apply` (spec 013, §3). */
  checkNotFinished(): void {
    if (this.isFinished()) {
      throw new ConflictError(`Game ${this.id} is finished`, 'err-game-finished');
    }
  }

  /** Finishes the game with its outcome (spec 013, §3). Only a game in progress can be finished. */
  finish(outcome: TacticalGameOutcome): void {
    this.checkNotFinished();
    if (this.status !== 'in_progress') {
      throw new ValidationError(`Game ${this.id} is not in progress`, 'err-game-not-in-progress');
    }
    this.status = 'finished';
    this.outcome = outcome;
    this.updatedAt = new Date();
    this.apply(new GameFinishedEvent(this));
  }

  /** The characters of the outcome not applied to the strategic model yet. */
  pendingOutcomeCharacters(): TacticalGameOutcomeCharacter[] {
    if (!this.isFinished() || !this.outcome) {
      throw new ValidationError(`Game ${this.id} is not finished`, 'err-game-not-finished');
    }
    if (this.outcome.appliedAt) {
      throw new ConflictError(`The outcome of game ${this.id} is already applied`, 'err-outcome-already-applied');
    }
    return this.outcome.characters.filter(character => !character.appliedAt);
  }

  /** Records the result of applying a character; the outcome is applied once every character is. */
  markOutcomeApplied(actorId: string, error?: string): void {
    const character = this.outcome?.characters.find(each => each.actorId === actorId);
    if (!character) {
      return;
    }
    if (error) {
      character.error = error;
    } else {
      character.appliedAt = new Date().toISOString();
      delete character.error;
    }
    if (this.outcome!.characters.every(each => !!each.appliedAt)) {
      this.outcome!.appliedAt = new Date().toISOString();
      this.apply(new GameAppliedEvent(this));
    }
    this.updatedAt = new Date();
  }

  update(
    name: string | undefined,
    description: string | undefined,
    environment: GameEnvironment | undefined,
    imageUrl: string | undefined,
  ) {
    if (name) this.name = name;
    if (description) this.description = description;
    if (environment) this.environment = environment;
    if (imageUrl !== undefined) this.imageUrl = imageUrl;
    // A PATCH that changes nothing is a 200 with the game as it is, and no event (spec 021, decision 9).
    if (!this.hasChanges()) return;
    this.updatedAt = new Date();
    this.apply(new GameUpdatedEvent(this));
  }

  addFactions(factions: string[]) {
    this.checkNotFinished();
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
    this.checkNotFinished();
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
    this.factions = this.factions.filter(f => !factions.includes(f));
    this.actors = this.actors.filter(a => !factions.includes(a.faction.id));
    this.updatedAt = new Date();
    this.apply(new GameUpdatedEvent(this));
  }

  addActors(actors: Actor[]) {
    this.checkNotFinished();
    if (actors.length === 0) {
      throw new ValidationError(`No actors provided`);
    }
    for (const actor of actors) {
      if (this.actors.find(a => a.id === actor.id && a.type === actor.type)) {
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
    this.checkNotFinished();
    if (this.status !== 'created') {
      throw new ValidationError(`Cannot delete actors from a game that is not in 'created' status`);
    }
    ids.forEach(id => {
      const index = this.actors.findIndex(a => a.id === id);
      if (index === -1) {
        throw new ValidationError(`Actor ${id} does not exist in the game`);
      }
      this.actors.splice(index, 1);
    });
    this.updatedAt = new Date();
    this.apply(new GameUpdatedEvent(this));
  }

  startRound() {
    this.checkNotFinished();
    this.status = 'in_progress';
    this.phase = 'declare_initiative';
    this.round += 1;
    this.apply(new GameRoundStartedEvent(this));
    this.updatedAt = new Date();
  }

  startPhase() {
    this.checkNotFinished();
    if (!Game.phaseTransitions.has(this.phase)) {
      throw new ValidationError(`Cannot start next phase from phase ${this.phase}`);
    }
    this.phase = Game.phaseTransitions.get(this.phase)!;
    this.apply(new GamePhaseStartedEvent(this));
    this.updatedAt = new Date();
  }

  /** The action phase number (1-4) of a game phase, undefined outside the action phases. */
  static toActionPhase(phase: GamePhase): number | undefined {
    const match = /^phase_(\d)$/.exec(phase);
    return match ? parseInt(match[1]) : undefined;
  }

  /**
   * Phase number stamped on the effects applied now: 0 before the action phases, 1-4 in them and 5 in the upkeep
   * (see `ActorRoundEffect.appliedPhase`).
   */
  getEffectPhase(): number {
    if (this.phase === 'upkeep') {
      return 5;
    }
    return Game.toActionPhase(this.phase) ?? 0;
  }

  getActionPhase(): number {
    this.checkValidActionManagement();
    return parseInt(this.phase.replace('phase_', ''));
  }

  checkValidActionManagement() {
    this.checkNotFinished();
    if (this.status !== 'in_progress') {
      throw new ValidationError('Game is not in progress');
    }
    if (!['phase_1', 'phase_2', 'phase_3', 'phase_4'].includes(this.phase)) {
      throw new ValidationError('Game is not in a phase that allows action management');
    }
  }

  getProps(): GameProps {
    return {
      id: this.id,
      strategicGameId: this.strategicGameId,
      name: this.name,
      status: this.status,
      round: this.round,
      phase: this.phase,
      factions: this.factions,
      actors: this.actors,
      environment: this.environment,
      description: this.description,
      imageUrl: this.imageUrl,
      owner: this.owner,
      outcome: this.outcome,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
