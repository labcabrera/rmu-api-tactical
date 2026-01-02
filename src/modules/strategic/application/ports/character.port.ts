import { AttackRange } from '../../../actor-rounds/domain/value-objets/actor-round-attack.vo';

export interface CharacterPort {
  findById: (id: string) => Promise<Character | undefined>;

  findByGameId: (gameId: string) => Promise<Character[]>;
}

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
  items: CharacterItem[];
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
  defensiveBonus: number;
  armor: CharacterArmor;
}

export interface CharacterArmor {
  at: number | undefined;
  bodyAt: number | undefined;
  headAt: number | undefined;
  armsAt: number | undefined;
  legsAt: number | undefined;
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

export interface CharacterItem {
  id: string;
  name: string;
  itemTypeId: string;
  category: string;
  carried: boolean;
  weapon: CharacterItemWeapon | undefined;
}

export interface CharacterItemWeapon {
  attackTable: string;
  fumbleTable: string;
  skillId: string;
  fumble: number;
  sizeAdjustment: number;
  requiredHands: number;
  throwable: boolean;
  ranges: AttackRange[] | undefined;
}

export interface CharacterEquipment {
  mainHand: string | undefined;
  maneuverPenalty: number;
}

export interface CharacterAttack {
  attackName: string;
  attackTable: string;
  sizeAdjustment: number;
  fumbleTable: string;
  type: 'melee' | 'ranged';
  fumble: number;
  bo: number;
}
