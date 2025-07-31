import { Page } from '@domain/entities/page.entity';
import { TacticalCharacterRoundEntity } from '@domain/entities/tactical-character-round.entity';
import { TacticalCharacterRoundQuery } from '../queries/tactical-character-round.query';

export interface TacticalCharacterRoundRepository {

    findById(id: string): Promise<TacticalCharacterRoundEntity>;

    find(criteria: TacticalCharacterRoundQuery): Promise<Page<TacticalCharacterRoundEntity>>;

    findByGameIdAndRound(gameId: string, round: number): Promise<TacticalCharacterRoundEntity[]>;

    findByCharacterIdAndRound(characterId: string, round: number): Promise<TacticalCharacterRoundEntity | null>;

    create(characterRound: Omit<TacticalCharacterRoundEntity, 'id'>): Promise<TacticalCharacterRoundEntity>;

    update(id: string, characterRound: Partial<TacticalCharacterRoundEntity>): Promise<TacticalCharacterRoundEntity>;

    delete(id: string): Promise<void>;

    deleteByGameId(gameId: string): Promise<void>;

}
