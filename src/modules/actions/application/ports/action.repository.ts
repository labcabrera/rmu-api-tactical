import { Page } from '../../../shared/domain/entities/page.entity';
import { Action } from '../../domain/aggregates/action.aggregate';

export interface ActionRepository {
  findById(id: string): Promise<Action | null>;

  findByRsql(rsql: string | undefined, page: number, size: number): Promise<Page<Action>>;

  save(entity: Partial<Action>): Promise<Action>;

  update(id: string, entity: Partial<Action>): Promise<Action>;

  deleteById(id: string): Promise<Action | null>;

  deleteByGameId(gameId: string): Promise<void>;

  deleteByCharacterId(characterId: string): Promise<void>;
}
