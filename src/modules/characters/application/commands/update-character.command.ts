import { CharacterHP, CharacterInfo } from '../../domain/entities/character.entity';

export class UpdateCharacterCommand {
  constructor(
    public readonly characterId: string,
    public readonly name?: string,
    public readonly faction?: string,
    public readonly info?: Partial<CharacterInfo>,
    public readonly hp?: Partial<CharacterHP>,
  ) {}
}
