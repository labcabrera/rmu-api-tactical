import {
  CharacterInfo,
  CharacterStatistics,
  CreateTacticalCharacterItem,
} from "@domain/entities/character.entity";

export interface CreateCharacterCommand {
  user: string;
  gameId: string;
  faction: string;
  name: string;
  info: CharacterInfo;
  statistics: CharacterStatistics;
  movement: {
    strideCustomBonus?: number;
    strideRacialBonus?: number;
  };
  endurance: {
    max: number;
  };
  hp: {
    max: number;
  };
  skills?: any;
  items?: CreateTacticalCharacterItem[];
}
