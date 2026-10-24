import type { QueryFilter, SortOrder } from 'mongoose';
import { Page } from '../pagination/page.js';

// The filter and sort are still Mongo types (they leak the infrastructure into the ports).
export interface BaseRepository<I> {
  findById(id: string): Promise<I | null>;

  findByRsql(
    rsql: string | undefined,
    page: number,
    size: number,
    filter?: QueryFilter<any>,
    sort?: Record<string, SortOrder>,
  ): Promise<Page<I>>;

  /** Stores a new entity; an id that already exists is a ConflictError (`duplicate-key`). */
  save(entity: I): Promise<I>;

  /**
   * Writes the entity, provided it is still at the version it was loaded with: otherwise a ConflictError
   * (`version-conflict`).
   */
  update(entity: I): Promise<I>;

  deleteById(id: string): Promise<I | null>;
}
