import { Page } from '../../../shared/application/pagination/page.js';
import { Action } from '../../domain/aggregates/action.js';

export interface ActionRepository {
  findById(id: string): Promise<Action | null>;

  findByRsql(rsql: string | undefined, page: number, size: number): Promise<Page<Action>>;

  save(entity: Partial<Action>): Promise<Action>;

  update(id: string, entity: Partial<Action>): Promise<Action>;

  deleteById(id: string): Promise<Action | null>;

  deleteByGameId(gameId: string): Promise<void>;

  deleteByCharacterId(characterId: string): Promise<void>;
}

export const ACTION_REPOSITORY = Symbol('ActionRepository');
