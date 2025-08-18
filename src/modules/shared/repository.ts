import { Page } from './page.entity';

export interface Repository<I> {
  findById(id: string): Promise<I | null>;

  findByRsql(rsql: string | undefined, page: number, size: number): Promise<Page<I>>;

  save(entity: Partial<I>): Promise<I>;

  update(id: string, entity: Partial<I>): Promise<I>;

  deleteById(id: string): Promise<I | void>;
}
