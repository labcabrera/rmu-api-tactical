import { CharacterSize } from 'src/modules/core/domain/entities/character-size';

export interface CharacterSizeRepository {
  findById(id: string): CharacterSize | null;
  find(): CharacterSize[];
}
