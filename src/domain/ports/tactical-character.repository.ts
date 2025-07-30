import { Page } from '../entities/page.entity';
import { TacticalCharacter, TacticalCharacterSearchCriteria } from '../entities/tactical-character.entity';

export interface TacticalCharacterRepository {
    findById(id: string): Promise<TacticalCharacter | null>;
    find(criteria: TacticalCharacterSearchCriteria): Promise<Page<TacticalCharacter>>;
    create(character: Omit<TacticalCharacter, 'id' | 'createdAt' | 'updatedAt'>): Promise<TacticalCharacter>;
    update(id: string, character: Partial<TacticalCharacter>): Promise<TacticalCharacter | null>;
    delete(id: string): Promise<boolean>;
}
