import { Character } from '@domain/entities/character.entity';
import { Repository } from './repository';

export interface CharacterRepository extends Repository<Character> {
  findByGameId(gameId: string): Promise<Character[]>;

  deleteByGameId(gameId: string): Promise<void>;
}
