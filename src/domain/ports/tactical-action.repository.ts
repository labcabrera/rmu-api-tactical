import { Page } from '../entities/page.entity';
import { TacticalAction, TacticalActionSearchCriteria } from '../entities/tactical-action.entity';

export interface TacticalActionRepository {

    findById(id: string): Promise<TacticalAction | null>;

    find(criteria: TacticalActionSearchCriteria): Promise<Page<TacticalAction>>;

    findByGameId(gameId: string): Promise<TacticalAction[]>;

    findByGameIdAndRound(gameId: string, round: number): Promise<TacticalAction[]>;

    findByCharacterId(characterId: string): Promise<TacticalAction[]>;

    findByCharacterIdAndRound(characterId: string, round: number): Promise<TacticalAction[]>;

    create(action: Omit<TacticalAction, 'id'>): Promise<TacticalAction>;

    update(id: string, action: Partial<TacticalAction>): Promise<TacticalAction | null>;

    delete(id: string): Promise<boolean>;

    deleteByGameId(gameId: string): Promise<number>;

    deleteByCharacterId(characterId: string): Promise<number>;

}
