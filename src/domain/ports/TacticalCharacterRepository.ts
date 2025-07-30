import { Page } from '../entities/page.entity';
import { TacticalCharacterEntity, TacticalCharacterSearchCriteria } from '../entities/tactical-character.entity';

export interface TacticalCharacterRepository {
    findById(id: string): Promise<TacticalCharacterEntity | null>;
    find(criteria: TacticalCharacterSearchCriteria): Promise<Page<TacticalCharacterEntity>>;
    create(character: Omit<TacticalCharacterEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<TacticalCharacterEntity>;
    update(id: string, character: Partial<TacticalCharacterEntity>): Promise<TacticalCharacterEntity | null>;
    delete(id: string): Promise<boolean>;
}
