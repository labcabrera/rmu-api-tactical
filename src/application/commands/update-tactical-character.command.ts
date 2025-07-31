import { CharacterHP, CharacterInfo } from '../../domain/entities/tactical-character.entity';

export interface UpdateTacticalCharacterCommand {
    characterId: string;
    name?: string;
    faction?: string;
    info?: Partial<CharacterInfo>;
    hp?: Partial<CharacterHP>;
}