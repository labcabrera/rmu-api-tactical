import { CharacterInfo, CharacterStatistics, CreateTacticalCharacterItem } from '../../domain/entities/character.entity';

export class CreateCharacterCommand {
  constructor(
    public readonly gameId: string,
    public readonly faction: string,
    public readonly name: string,
    public readonly info: CharacterInfo,
    public readonly statistics: CharacterStatistics,
    public readonly strideCustomBonus: number | undefined,
    public readonly enduranceCustomBonus: number | undefined,
    public readonly hpCustomBonus: number | undefined,
    //TODO MAP
    public readonly skills: any,
    public readonly items: CreateTacticalCharacterItem[] | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
