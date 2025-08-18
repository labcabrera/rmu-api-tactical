import { Repository } from '../../../../shared/repository';
import { Character } from '../../../domain/entities/character.entity';

export interface CharacterRepository extends Repository<Character> {
  findByGameId(gameId: string): Promise<Character[]>;

  deleteByGameId(gameId: string): Promise<void>;
}
