import { Page } from '@domain/entities/page.entity';
import { TacticalAction } from '@domain/entities/tactical-action.entity';
import { TacticalActionQuery } from '../queries/tactical-action.query';

export interface TacticalActionRepository {

    findById(id: string): Promise<TacticalAction>;

    find(criteria: TacticalActionQuery): Promise<Page<TacticalAction>>;

    findByGameId(gameId: string): Promise<TacticalAction[]>;

    findByGameIdAndRound(gameId: string, round: number): Promise<TacticalAction[]>;

    findByCharacterId(characterId: string): Promise<TacticalAction[]>;

    findByCharacterIdAndRound(characterId: string, round: number): Promise<TacticalAction[]>;

    create(action: Omit<TacticalAction, 'id'>): Promise<TacticalAction>;

    update(id: string, action: Partial<TacticalAction>): Promise<TacticalAction | null>;

    delete(id: string): Promise<void>;

    deleteByGameId(gameId: string): Promise<void>;

    deleteByCharacterId(characterId: string): Promise<void>;

}
