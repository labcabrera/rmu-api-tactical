import { Page } from '@domain/entities/page.entity';

export interface Repository<I> {
  findById(id: string): Promise<I | null>;

  findByRsql(rsql: string, page: number, size: number): Promise<Page<I>>;

  save(entity: Partial<I>): Promise<I>;

  update(id: string, entity: Partial<I>): Promise<I>;

  deleteById(id: string): Promise<void>;
}
