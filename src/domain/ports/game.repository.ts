import { Game } from "@/domain/entities/game.entity";
import { GameQuery } from "@/domain/queries/game.query";
import { Page } from "@domain/entities/page.entity";

export interface GameRepository {
  findById(id: string): Promise<Game>;

  find(criteria: GameQuery): Promise<Page<Game>>;

  save(game: Game): Promise<Game>;

  update(id: string, game: Partial<Game>): Promise<Game>;

  delete(id: string): Promise<void>;

  countBy(filter: any): Promise<number>;
}
