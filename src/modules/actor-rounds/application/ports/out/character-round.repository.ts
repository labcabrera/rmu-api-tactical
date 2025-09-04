import { Page } from '../../../../shared/domain/entities/page.entity';
import { ActorRound } from '../../../domain/entities/actor-round.entity';

export interface ActorRoundRepository {
  findById(id: string): Promise<ActorRound | null>;

  findByRsql(rsql: string | undefined, page: number, size: number): Promise<Page<ActorRound>>;

  findByGameIdAndRound(gameId: string, round: number): Promise<ActorRound[]>;

  findByActorIdAndRound(characterId: string, round: number): Promise<ActorRound | null>;

  save(entity: Partial<ActorRound>): Promise<ActorRound>;

  update(characterRoundId: string, data: Partial<ActorRound>): Promise<ActorRound>;

  deleteByGameId(gameId: string): Promise<void>;

  countWithUndefinedInitiativeRoll(gameId: string, round: number): Promise<number>;
}
