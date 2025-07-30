import { IPaginatedResponse } from '../../types';
import { TacticalCharacterEntity, TacticalCharacterSearchCriteria } from '../entities/TacticalCharacter';

export interface TacticalCharacterRepository {
    findById(id: string): Promise<TacticalCharacterEntity | null>;
    find(criteria: TacticalCharacterSearchCriteria): Promise<IPaginatedResponse<TacticalCharacterEntity>>;
    create(character: Omit<TacticalCharacterEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<TacticalCharacterEntity>;
    update(id: string, character: Partial<TacticalCharacterEntity>): Promise<TacticalCharacterEntity | null>;
    delete(id: string): Promise<boolean>;
}
