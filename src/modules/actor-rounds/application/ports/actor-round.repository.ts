import { Page } from '../../../shared/domain/entities/page.entity';
import { ActorRound } from '../../domain/aggregates/actor-round.aggregate';

export interface ActorRoundRepository {
  findById(id: string): Promise<ActorRound | null>;

  findByIds(ids: string[]): Promise<ActorRound[]>;

  findByRsql(rsql: string | undefined, page: number, size: number): Promise<Page<ActorRound>>;

  /** The actor round of an actor in one round of a game (an actor can be in several games). */
  findByActorIdAndRound(gameId: string, actorId: string, round: number): Promise<ActorRound | null>;

  findByGameAndRoundAndActors(gameId: string, round: number, actorIds: string[]): Promise<ActorRound[]>;

  save(entity: ActorRound): Promise<ActorRound>;

  update(characterRoundId: string, data: Partial<ActorRound>): Promise<ActorRound>;

  deleteByGameId(gameId: string): Promise<void>;

  findWithUndefinedInitiativeRoll(gameId: string, round: number): Promise<ActorRound[]>;
}
