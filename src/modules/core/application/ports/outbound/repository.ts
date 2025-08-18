import { Page } from 'src/modules/core/domain/entities/page';

export interface Repository<I> {
  findById(id: string): Promise<I | null>;

  findByRsql(rsql: string | undefined, page: number, size: number): Promise<Page<I>>;

  save(entity: Partial<I>): Promise<I>;

  update(id: string, entity: Partial<I>): Promise<I>;

  deleteById(id: string): Promise<I | null>;
}
