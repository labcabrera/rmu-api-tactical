import { Page } from '../../../shared/domain/entities/page.entity';
import { Game } from '../../domain/entities/game.entity';

export interface GameRepository {
  findById(id: string): Promise<Game | null>;

  findByRsql(rsql: string | undefined, page: number, size: number): Promise<Page<Game>>;

  save(entity: Partial<Game>): Promise<Game>;

  update(id: string, entity: Partial<Game>): Promise<Game>;

  deleteById(id: string): Promise<Game | null>;
}
