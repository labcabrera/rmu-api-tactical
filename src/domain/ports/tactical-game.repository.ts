import { Page } from '../entities/page.entity';
import { TacticalGame } from '../entities/tactical-game.entity';
import { TacticalGameQuery } from '../queries/tactical-game.query';

export interface TacticalGameRepository {

    findById(id: string): Promise<TacticalGame>;

    find(criteria: TacticalGameQuery): Promise<Page<TacticalGame>>;

    save(game: TacticalGame): Promise<TacticalGame>;

    update(id: string, game: Partial<TacticalGame>): Promise<TacticalGame | null>;

    delete(id: string): Promise<boolean>;

    countBy(filter: any): Promise<number>;
}
