import { FilterQuery } from 'mongoose';
import { Page } from '../../domain/entities/page.entity';

//TODO using filterQuery hit infrastructure layer
export interface BaseRepository<I> {
  findById(id: string): Promise<I | null>;

  findByRsql(rsql: string | undefined, page: number, size: number, filter?: FilterQuery<any>, sort?: any): Promise<Page<I>>;

  save(entity: Partial<I>): Promise<I>;

  update(id: string, entity: Partial<I>): Promise<I>;

  deleteById(id: string): Promise<I | null>;
}
