import { Page } from '../../../shared/application/pagination/page';
import { Game } from '../../domain/aggregates/game';

export interface GameRepository {
  findById(id: string): Promise<Game | null>;

  findByStrategicId(strategicGameId: string): Promise<Game[]>;

  findByRsql(
    rsql: string | undefined,
    page: number,
    size: number,
    filter?: Record<string, unknown>,
    sort?: Record<string, 1 | -1>,
  ): Promise<Page<Game>>;

  save(entity: Game): Promise<Game>;

  update(id: string, entity: Partial<Game>): Promise<Game>;

  deleteById(id: string): Promise<Game | null>;
}

export const GAME_REPOSITORY = Symbol('GameRepository');
