import { CharacterInfo, CharacterStatistics } from '../../domain/entities/character.entity';

export class CreateCharacterCommand {
  constructor(
    public readonly gameId: string,
    public readonly faction: string,
    public readonly name: string,
    public readonly info: CharacterInfo,
    public readonly statistics: CharacterStatistics,
    public readonly strideCustomBonus: number | undefined,
    public readonly enduranceCustomBonus: number | undefined,
    public readonly initiativeCustomBonus: number | undefined,
    public readonly skills: CreateCharacterSkill[],
    public readonly items: CreateCharacterItem[],
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

export interface CreateCharacterSkill {
  skillId: string;
  specialization: string | undefined;
  ranks: number;
  customBonus: number | undefined;
}

export interface CreateCharacterItem {
  name: string | undefined;
  itemTypeId: string;
}
