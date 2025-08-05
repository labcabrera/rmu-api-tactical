import { CharacterHP, CharacterInfo } from '@domain/entities/character.entity';

export interface UpdateCharacterCommand {
  characterId: string;
  name?: string;
  faction?: string;
  info?: Partial<CharacterInfo>;
  hp?: Partial<CharacterHP>;
}
