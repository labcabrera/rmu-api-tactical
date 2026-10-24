import { Page } from '../../../shared/application/pagination/page.js';
import { ActorRound } from '../../domain/aggregates/actor-round.js';

export interface ActorRoundRepository {
  findById(id: string): Promise<ActorRound | null>;

  findByIds(ids: string[]): Promise<ActorRound[]>;

  findByRsql(rsql: string | undefined, page: number, size: number): Promise<Page<ActorRound>>;

  /** The actor round of an actor in one round of a game (an actor can be in several games). */
  findByActorIdAndRound(gameId: string, actorId: string, round: number): Promise<ActorRound | null>;

  findByGameAndRoundAndActors(gameId: string, round: number, actorIds: string[]): Promise<ActorRound[]>;

  save(entity: ActorRound): Promise<ActorRound>;

  update(characterRoundId: string, data: Partial<ActorRound>): Promise<ActorRound>;

  /** Every actor round of a game, all rounds (spec 013: the outcome of a finished game). */
  findByGameId(gameId: string): Promise<ActorRound[]>;

  deleteByGameId(gameId: string): Promise<void>;

  findWithUndefinedInitiativeRoll(gameId: string, round: number): Promise<ActorRound[]>;
}

export const ACTOR_ROUND_REPOSITORY = Symbol('ActorRoundRepository');
