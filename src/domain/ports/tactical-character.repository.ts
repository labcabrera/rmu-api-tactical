import { Page } from '../entities/page.entity';
import { TacticalCharacter } from '../entities/tactical-character.entity';
import { TacticalCharacterQuery } from '../queries/tactical-character.query';

export interface TacticalCharacterRepository {
    
    findById(id: string): Promise<TacticalCharacter>;
    
    find(criteria: TacticalCharacterQuery): Promise<Page<TacticalCharacter>>;
    
    create(character: Omit<TacticalCharacter, 'id'>): Promise<TacticalCharacter>;
    
    update(id: string, character: Partial<TacticalCharacter>): Promise<TacticalCharacter>;
    
    delete(id: string): Promise<void>;

    deleteByGameId(gameId: string): Promise<void>;

}
