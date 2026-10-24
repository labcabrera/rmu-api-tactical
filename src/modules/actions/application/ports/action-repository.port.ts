import { Page } from '../../../shared/application/pagination/page.js';
import { Action } from '../../domain/aggregates/action.js';

export interface ActionRepository {
  findById(id: string): Promise<Action | null>;

  /** `filter` narrows the RSQL, such as to the games the user can read (spec 021). */
  findByRsql(rsql: string | undefined, page: number, size: number, filter?: Record<string, unknown>): Promise<Page<Action>>;

  /** Stores a new action; an id that already exists is a ConflictError (`duplicate-key`). */
  save(entity: Action): Promise<Action>;

  /** Writes the action, provided it is still at the version it was loaded with (else a `version-conflict`). */
  update(entity: Action): Promise<Action>;

  deleteById(id: string): Promise<Action | null>;

  deleteByGameId(gameId: string): Promise<void>;

  deleteByCharacterId(characterId: string): Promise<void>;
}

export const ACTION_REPOSITORY = Symbol('ActionRepository');
