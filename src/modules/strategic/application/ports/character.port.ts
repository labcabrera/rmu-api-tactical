import { AttackRange } from '../../../actor-rounds/domain/value-objets/actor-round-attack.vo';
import { ActorRoundFaction } from '../../../actor-rounds/domain/value-objets/actor-round-faction.vo';
import { ActorRoundShield } from '../../../actor-rounds/domain/value-objets/actor-round-shield.vo';

export type AttackType = 'melee' | 'ranged';

export interface CharacterPort {
  findById: (id: string) => Promise<Character | undefined>;

  findByGameId: (gameId: string) => Promise<Character[]>;
}

export interface Character {
  id: string;
  gameId: string;
  faction: ActorRoundFaction;
  name: string;
  info: CharacterInfo;
  experience: CharacterExperience;
  movement: CharacterMovement;
  defense: CharacterDefense;
  hp: CharacterHP;
  initiative: CharacterInitiative;
  skills: CharacterSkill[];
  items: CharacterItem[];
  equipment: CharacterEquipment;
  attacks: CharacterAttack[];
  imageUrl: string | undefined;
  owner: string;
}

export interface CharacterInfo {
  raceName: string;
  raceId: string;
  sizeId: string;
}

export interface CharacterExperience {
  level: number;
}

export interface CharacterMovement {
  baseMovementRate: number;
  maxPace: string;
}

export interface CharacterDefense {
  defensiveBonus: number;
  armor: CharacterArmor;
  shield: ActorRoundShield | null;
}

export interface CharacterArmor {
  at: number | null;
  bodyAt: number | null;
  headAt: number | null;
  armsAt: number | null;
  legsAt: number | null;
}

export interface CharacterHP {
  max: number;
  current: number;
}

export interface CharacterInitiative {
  totalBonus: number;
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

export interface CharacterItemMode {
  type: string;
  attackTypes: string[];
  attackTable: string;
  fumbleTable: string;
  sizeAdjustment: number;
  ranges: AttackRange[] | undefined;
}

export interface CharacterItemWeapon {
  skillId: string;
  fumble: number;
  modes: CharacterItemMode[];
}

export interface CharacterEquipment {
  slots: Record<string, string | null>;
  maneuverPenalty: number;
  encumbrancePenalty: number;
  movementBaseDifficulty: string;
}

export interface CharacterAttackRange {
  from: number;
  to: number;
  bonus: number;
}

export interface CharacterAttack {
  attackName: string;
  attackTable: string;
  sizeAdjustment: number;
  fumble: number;
  bo: number;
  type: AttackType;
  meleeRange: number | null;
  ranges: CharacterAttackRange[] | null;
  fumbleTable: string;
}
