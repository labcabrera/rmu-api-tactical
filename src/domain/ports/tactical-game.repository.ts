import { Page } from '@domain/entities/page.entity';
import { TacticalGame } from '@domain/entities/tactical-game.entity';
import { TacticalGameQuery } from '@domain/queries/tactical-game.query';

export interface TacticalGameRepository {

    findById(id: string): Promise<TacticalGame>;

    find(criteria: TacticalGameQuery): Promise<Page<TacticalGame>>;

    save(game: TacticalGame): Promise<TacticalGame>;

    update(id: string, game: Partial<TacticalGame>): Promise<TacticalGame>;

    delete(id: string): Promise<void>;

    countBy(filter: any): Promise<number>;
}
