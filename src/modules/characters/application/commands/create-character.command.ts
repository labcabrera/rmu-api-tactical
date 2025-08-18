import { CharacterInfo, CharacterStatistics, CreateTacticalCharacterItem } from '../../domain/entities/character.entity';

export class CreateCharacterCommand {
  constructor(
    public readonly user: string,
    public readonly gameId: string,
    public readonly faction: string,
    public readonly name: string,
    public readonly info: CharacterInfo,
    public readonly statistics: CharacterStatistics,
    public readonly strideCustomBonus: number | undefined,
    public readonly strideRacialBonus: number | undefined,
    public readonly maxEndurance: number,
    public readonly maxHP: number,
    public readonly skills?: any,
    public readonly items?: CreateTacticalCharacterItem[],
  ) {}
}
