export interface CharacterPort {
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
  movement: CharacterMovement;
  defense: CharacterDefense;
  hp: CharacterHP;
  initiative: CharacterInitiative;
  skills: CharacterSkill[];
  equipment: CharacterEquipment;
  attacks: CharacterAttack[];
  owner: string;
}

export interface CharacterInfo {
  sizeId: string;
}

export interface CharacterMovement {
  baseMovementRate: number;
}

export interface CharacterDefense {
  armorType: number;
  defensiveBonus: number;
}

export interface CharacterHP {
  max: number;
  current: number;
}

export interface CharacterInitiative {
  baseBonus: number;
}

export interface CharacterSkill {
  skillId: string;
  totalBonus: number;
}

export interface CharacterEquipment {
  maneuverPenalty: number;
}

export interface CharacterAttack {
  attackName: string;
  attackTable: string;
  sizeAdjustment: number;
  fumbleTable: string;
  fumble: number;
  bo: number;
}
