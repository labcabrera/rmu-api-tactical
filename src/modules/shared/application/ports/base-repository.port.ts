import type { QueryFilter } from 'mongoose';
import { Page } from '../pagination/page.js';

//TODO using filterQuery hit infrastructure layer
export interface BaseRepository<I> {
  findById(id: string): Promise<I | null>;

  findByRsql(rsql: string | undefined, page: number, size: number, filter?: QueryFilter<any>, sort?: any): Promise<Page<I>>;

  save(entity: Partial<I>): Promise<I>;

  update(id: string, entity: Partial<I>): Promise<I>;

  deleteById(id: string): Promise<I | null>;
}
