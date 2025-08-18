import { Repository } from '../../../../shared/repository';
import { CharacterRound } from '../../../domain/entities/character-round.entity';

export interface CharacterRoundRepository extends Repository<CharacterRound> {
  findByGameIdAndRound(gameId: string, round: number): Promise<CharacterRound[]>;

  findByCharacterIdAndRound(characterId: string, round: number): Promise<CharacterRound | null>;

  deleteByGameId(gameId: string): Promise<void>;
}
