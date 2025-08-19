import { Page } from '../../../../shared/domain/entities/page.entity';
import { CharacterRound } from '../../../domain/entities/character-round.entity';

export interface CharacterRoundRepository {
  findById(id: string): Promise<CharacterRound | null>;

  findByRsql(rsql: string | undefined, page: number, size: number): Promise<Page<CharacterRound>>;

  findByGameIdAndRound(gameId: string, round: number): Promise<CharacterRound[]>;

  findByCharacterIdAndRound(characterId: string, round: number): Promise<CharacterRound | null>;

  save(entity: Partial<CharacterRound>): Promise<CharacterRound>;

  update(characterRoundId: string, data: Partial<CharacterRound>): Promise<CharacterRound>;

  deleteByGameId(gameId: string): Promise<void>;
}
