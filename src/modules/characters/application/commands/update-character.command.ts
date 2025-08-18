import { CharacterHP, CharacterInfo } from '../../domain/entities/character.entity';

export class UpdateCharacterCommand {
  constructor(
    public readonly characterId: string,
    public readonly name: string | undefined,
    public readonly faction: string | undefined,
    public readonly info: Partial<CharacterInfo> | undefined,
    public readonly hp: Partial<CharacterHP> | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
