import { Page } from '../entities/page.entity';
import {
    TacticalGame,
    TacticalGameSearchCriteria
} from '../entities/tactical-game.entity';

export interface TacticalGameRepository {

    findById(id: string): Promise<TacticalGame | null>;

    find(criteria: TacticalGameSearchCriteria): Promise<Page<TacticalGame>>;

    save(game: TacticalGame): Promise<TacticalGame>;

    update(id: string, game: Partial<TacticalGame>): Promise<TacticalGame | null>;

    delete(id: string): Promise<boolean>;

    countBy(filter: any): Promise<number>;
}
