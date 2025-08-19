import { Page } from '../../../../shared/domain/entities/page.entity';
import { Character } from '../../../domain/entities/character.entity';

export interface CharacterRepository {
  findById(id: string): Promise<Character | null>;

  findByGameId(gameId: string): Promise<Character[]>;

  findByRsql(rsql: string | undefined, page: number, size: number): Promise<Page<Character>>;

  save(entity: Partial<Character>): Promise<Character>;

  update(id: string, entity: Partial<Character>): Promise<Character>;

  deleteById(id: string): Promise<Character | null>;

  deleteByGameId(gameId: string): Promise<void>;
}
