export interface CharacterClient {
  findById: (id: string) => Promise<Character | undefined>;

  findByGameId: (gameId: string) => Promise<Character[]>;
}

//TODO
export interface Character {
  id: string;
  gameId: string;
  factionId: string;
  name: string;
  info: CharacterInfo;
  defense: CharacterDefense;
  hp: CharacterHP;
  initiative: CharacterInitiative;
  attacks: CharacterAttack[];
  owner: string;
}

export interface CharacterInfo {
  sizeId: string;
}

export interface CharacterDefense {
  armorType: number;
  defensiveBonus: number;
}

export interface CharacterHP {
  max: number;
}

export interface CharacterInitiative {
  baseBonus: number;
}

export interface CharacterAttack {
  attackName: string;
  attackTable: string;
  sizeAdjustment: number;
  fumbleTable: string;
  fumble: number;
  bo: number;
}
