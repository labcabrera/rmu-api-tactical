import { Page } from '../entities/page.entity';
import { TacticalCharacterRoundEntity, TacticalCharacterRoundSearchCriteria } from '../entities/tactical-character-round.entity';

export interface TacticalCharacterRoundRepository {
    findById(id: string): Promise<TacticalCharacterRoundEntity | null>;
    find(criteria: TacticalCharacterRoundSearchCriteria): Promise<Page<TacticalCharacterRoundEntity>>;
    findByGameIdAndRound(gameId: string, round: number): Promise<TacticalCharacterRoundEntity[]>;
    findByCharacterIdAndRound(tacticalCharacterId: string, round: number): Promise<TacticalCharacterRoundEntity | null>;
    create(characterRound: Omit<TacticalCharacterRoundEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<TacticalCharacterRoundEntity>;
    update(id: string, characterRound: Partial<TacticalCharacterRoundEntity>): Promise<TacticalCharacterRoundEntity | null>;
    delete(id: string): Promise<boolean>;
    deleteByGameId(gameId: string): Promise<number>;
}
