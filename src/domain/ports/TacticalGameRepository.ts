import {
    PaginatedTacticalGames,
    TacticalGame,
    TacticalGameSearchCriteria
} from '../entities/TacticalGame';

export interface TacticalGameRepository {
    findById(id: string): Promise<TacticalGame | null>;

    find(criteria: TacticalGameSearchCriteria): Promise<PaginatedTacticalGames>;

    save(game: TacticalGame): Promise<TacticalGame>;

    update(id: string, game: Partial<TacticalGame>): Promise<TacticalGame | null>;

    delete(id: string): Promise<boolean>;

    countBy(filter: any): Promise<number>;
}
