import { Page } from '../entities/page.entity';
import { TacticalActionEntity, TacticalActionSearchCriteria } from '../entities/tactical-action.entity';

export interface TacticalActionRepository {
    findById(id: string): Promise<TacticalActionEntity | null>;
    find(criteria: TacticalActionSearchCriteria): Promise<Page<TacticalActionEntity>>;
    findByGameId(gameId: string): Promise<TacticalActionEntity[]>;
    findByGameIdAndRound(gameId: string, round: number): Promise<TacticalActionEntity[]>;
    findByCharacterId(characterId: string): Promise<TacticalActionEntity[]>;
    findByCharacterIdAndRound(characterId: string, round: number): Promise<TacticalActionEntity[]>;
    create(action: Omit<TacticalActionEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<TacticalActionEntity>;
    update(id: string, action: Partial<TacticalActionEntity>): Promise<TacticalActionEntity | null>;
    delete(id: string): Promise<boolean>;
    deleteByGameId(gameId: string): Promise<number>;
    deleteByCharacterId(characterId: string): Promise<number>;
}
