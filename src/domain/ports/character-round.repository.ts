import { CharacterRound } from "@domain/entities/character-round.entity";
import { Page } from "@domain/entities/page.entity";
import { CharacterRoundQuery } from "../queries/character-round.query";

export interface CharacterRoundRepository {
  findById(id: string): Promise<CharacterRound>;

  find(criteria: CharacterRoundQuery): Promise<Page<CharacterRound>>;

  findByGameIdAndRound(
    gameId: string,
    round: number,
  ): Promise<CharacterRound[]>;

  findByCharacterIdAndRound(
    characterId: string,
    round: number,
  ): Promise<CharacterRound | null>;

  create(characterRound: Omit<CharacterRound, "id">): Promise<CharacterRound>;

  update(
    id: string,
    characterRound: Partial<CharacterRound>,
  ): Promise<CharacterRound>;

  delete(id: string): Promise<void>;

  deleteByGameId(gameId: string): Promise<void>;
}
