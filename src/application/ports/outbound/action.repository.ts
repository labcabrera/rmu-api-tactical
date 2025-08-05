import { Action } from '@domain/entities/action.entity';
import { Repository } from './repository';

export interface ActionRepository extends Repository<Action> {
  findByGameId(gameId: string): Promise<Action[]>;

  findByGameIdAndRound(gameId: string, round: number): Promise<Action[]>;

  findByCharacterId(characterId: string): Promise<Action[]>;

  findByCharacterIdAndRound(characterId: string, round: number): Promise<Action[]>;

  deleteByGameId(gameId: string): Promise<void>;

  deleteByCharacterId(characterId: string): Promise<void>;
}
