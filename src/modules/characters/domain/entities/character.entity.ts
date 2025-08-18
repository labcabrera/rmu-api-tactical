export interface Character {
  id: string;
  gameId: string;
  name: string;
  faction: string;
  info: CharacterInfo;
  statistics: CharacterStatistics;
  movement: CharacterMovement;
  defense: CharacterDefense;
  hp: CharacterHP;
  endurance: CharacterEndurance;
  power?: CharacterPower;
  initiative: CharacterInitiative;
  skills: CharacterSkill[];
  items: CharacterItem[];
  equipment: CharacterEquipment;
  status?: string;
  owner: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CharacterInfo {
  level: number;
  race: string;
  sizeId: string;
  height: number;
  weight: number;
}

export interface Stat {
  bonus: number;
  racial: number;
  custom: number;
  totalBonus: number;
}

export class CharacterStatistics {
  ag: Stat;
  co: Stat;
  em: Stat;
  in: Stat;
  me: Stat;
  pr: Stat;
  qu: Stat;
  re: Stat;
  sd: Stat;
  st: Stat;
}

export interface CharacterMovement {
  baseMovementRate: number;
  strideRacialBonus: number;
  strideQuBonus: number;
  strideCustomBonus: number;
}

export interface CharacterDefense {
  armorType: number;
  defensiveBonus: number;
}

export interface CharacterHP {
  customBonus: number;
  racialBonus: number;
  max: number;
  current: number;
}

export interface CharacterEndurance {
  customBonus: number;
  max: number;
  current: number;
  accumulator: number;
  fatiguePenalty: number;
}

export interface CharacterPower {
  max: number;
  current: number;
}

export interface CharacterInitiative {
  baseBonus: number;
  customBonus: number;
  penaltyBonus: number;
  totalBonus: number;
}

export interface CharacterSkill {
  skillId: string;
  specialization: string | undefined;
  statistics: string[];
  ranks: number;
  statBonus: number;
  racialBonus: number;
  developmentBonus: number;
  customBonus: number;
  totalBonus: number;
}

export interface CharacterItem {
  id: string;
  name: string;
  itemTypeId: string;
  category: string;
  weapon: CharacterItemWeapon | undefined;
  weaponRange: CharacterItemWeaponRange[] | undefined;
  armor: CharacterItemArmor | undefined;
  info: CharacterItemInfo;
}

export interface CharacterItemWeapon {
  attackTable: string;
  skillId: string;
  fumble: number;
  sizeAdjustment: number;
  requiredHands: number;
  throwable: boolean;
}

export interface CharacterItemWeaponRange {
  [key: string]: number;
}

export interface CharacterItemArmor {
  slot: string;
  armorType: number;
  enc: number;
  maneuver: number;
  rangedPenalty: number;
  perception: number;
}

export interface CharacterItemInfo {
  length: number;
  strength: number;
  weight: number;
  productionTime: number;
}

export interface CharacterEquipment {
  mainHand?: string | null;
  offHand?: string | null;
  body?: string | null;
  head?: string | null;
  weight: number | null;
}
