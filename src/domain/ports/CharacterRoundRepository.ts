import { IPaginatedResponse } from '../../types';
import { TacticalCharacterRoundEntity, TacticalCharacterRoundSearchCriteria } from '../entities/TacticalCharacterRound';

export interface TacticalCharacterRoundRepository {
    findById(id: string): Promise<TacticalCharacterRoundEntity | null>;
    find(criteria: TacticalCharacterRoundSearchCriteria): Promise<IPaginatedResponse<TacticalCharacterRoundEntity>>;
    findByGameIdAndRound(gameId: string, round: number): Promise<TacticalCharacterRoundEntity[]>;
    findByCharacterIdAndRound(tacticalCharacterId: string, round: number): Promise<TacticalCharacterRoundEntity | null>;
    create(characterRound: Omit<TacticalCharacterRoundEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<TacticalCharacterRoundEntity>;
    update(id: string, characterRound: Partial<TacticalCharacterRoundEntity>): Promise<TacticalCharacterRoundEntity | null>;
    delete(id: string): Promise<boolean>;
    deleteByGameId(gameId: string): Promise<number>;
}
