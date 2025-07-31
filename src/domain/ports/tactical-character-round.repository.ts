import { Page } from '@domain/entities/page.entity';
import { TacticalCharacterRound } from '@domain/entities/tactical-character-round.entity';
import { TacticalCharacterRoundQuery } from '../queries/tactical-character-round.query';

export interface TacticalCharacterRoundRepository {

    findById(id: string): Promise<TacticalCharacterRound>;

    find(criteria: TacticalCharacterRoundQuery): Promise<Page<TacticalCharacterRound>>;

    findByGameIdAndRound(gameId: string, round: number): Promise<TacticalCharacterRound[]>;

    findByCharacterIdAndRound(characterId: string, round: number): Promise<TacticalCharacterRound | null>;

    create(characterRound: Omit<TacticalCharacterRound, 'id'>): Promise<TacticalCharacterRound>;

    update(id: string, characterRound: Partial<TacticalCharacterRound>): Promise<TacticalCharacterRound>;

    delete(id: string): Promise<void>;

    deleteByGameId(gameId: string): Promise<void>;

}
