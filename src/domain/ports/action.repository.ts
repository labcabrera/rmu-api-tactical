import { Action } from "@/domain/entities/action.entity";
import { Page } from "@domain/entities/page.entity";
import { ActionQuery } from "../queries/action.query";

export interface ActionRepository {
  findById(id: string): Promise<Action>;

  find(criteria: ActionQuery): Promise<Page<Action>>;

  findByGameId(gameId: string): Promise<Action[]>;

  findByGameIdAndRound(gameId: string, round: number): Promise<Action[]>;

  findByCharacterId(characterId: string): Promise<Action[]>;

  findByCharacterIdAndRound(
    characterId: string,
    round: number,
  ): Promise<Action[]>;

  create(action: Omit<Action, "id">): Promise<Action>;

  update(id: string, action: Partial<Action>): Promise<Action | null>;

  delete(id: string): Promise<void>;

  deleteByGameId(gameId: string): Promise<void>;

  deleteByCharacterId(characterId: string): Promise<void>;
}
