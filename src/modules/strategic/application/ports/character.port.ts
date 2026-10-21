import { AttackRange, WeaponCategory } from '../../../actor-rounds/domain/value-objets/actor-round-attack.vo';
import { ActorRoundFaction } from '../../../actor-rounds/domain/value-objets/actor-round-faction.vo';
import { ActorRoundShield } from '../../../actor-rounds/domain/value-objets/actor-round-shield.vo';
import type { CharacterCondition, Injury } from '../../../actor-rounds/domain/value-objets/injury.vo';

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
  traits?: CharacterTrait[];
  items: CharacterItem[];
  equipment: CharacterEquipment;
  attacks: CharacterAttack[];
  /** Spec 013: missing in strategic versions before it. */
  injuries?: Injury[];
  /** Spec 013: missing in strategic versions before it. */
  conditions?: CharacterCondition[];
  /** `dead` once a tactical game killed it (spec 013); missing in older versions. */
  status?: string;
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
  protect: number;
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
  specialization: string | null;
  totalBonus: number;
  /** Missing in older characters: 0. */
  ranks?: number;
}

export interface CharacterTrait {
  traitId: string;
  traitName?: string;
  isTalent?: boolean;
  /** Missing for traits without tiers: 1. */
  tier?: number | null;
  cost?: number;
  /** Skill (`skillId` or `skillId@specialization`), weapon type, stat or realm the trait was taken for. */
  specialization?: string | null;
  source?: 'character' | 'race';
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
  /** Missing in older characters: false. */
  twoHanded?: boolean;
  /** Missing in older characters: `standard`. */
  weaponCategory?: WeaponCategory;
  /** The weapon is made for another size; its -20 is already in `bo`. Missing in older characters: false. */
  wrongSize?: boolean;
  /** Skill of the weapon (`melee-weapon@blade`, `shield`...). Missing in older characters. */
  skillId?: string | null;
}

/** Conditions that keep a character out of a tactical game (spec 013, §3). */
const NOT_ABLE_CONDITIONS = ['permanent-unconscious', 'dead'];

/** The character is dead or permanently unconscious, and cannot take part in a tactical game. */
export const isCharacterNotAble = (character: Character): boolean =>
  character.status === 'dead' || (character.conditions || []).some(c => !c.resolvedAt && NOT_ABLE_CONDITIONS.includes(c.status));
