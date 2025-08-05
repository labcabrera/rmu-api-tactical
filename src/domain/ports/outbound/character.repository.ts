import { Character } from '../../entities/character.entity';
import { Page } from '../../entities/page.entity';
import { CharacterQuery } from '../../queries/character.query';

export interface CharacterRepository {
  findById(id: string): Promise<Character>;

  find(criteria: CharacterQuery): Promise<Page<Character>>;

  create(character: Omit<Character, 'id'>): Promise<Character>;

  update(id: string, character: Partial<Character>): Promise<Character>;

  delete(id: string): Promise<void>;

  deleteByGameId(gameId: string): Promise<void>;
}
