import { TacticalGameQuery } from '../../application/queries/tactical-game.query';
import { Page } from '../entities/page.entity';
import {
    TacticalGame,
} from '../entities/tactical-game.entity';

export interface TacticalGameRepository {

    findById(id: string): Promise<TacticalGame>;

    //TODO fix. Defined in application layer
    find(criteria: TacticalGameQuery): Promise<Page<TacticalGame>>;

    save(game: TacticalGame): Promise<TacticalGame>;

    update(id: string, game: Partial<TacticalGame>): Promise<TacticalGame | null>;

    delete(id: string): Promise<boolean>;

    countBy(filter: any): Promise<number>;
}
