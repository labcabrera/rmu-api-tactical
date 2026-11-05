import type { TemporaryModifier } from '../../../actor-rounds/domain/value-objects/temporary-modifier.vo.js';
import { AttackRange, type WeaponCategory } from '../../../actor-rounds/domain/value-objects/actor-round-attack.vo.js';
import { ActorRoundFaction } from '../../../actor-rounds/domain/value-objects/actor-round-faction.vo.js';
import { ActorRoundShield } from '../../../actor-rounds/domain/value-objects/actor-round-shield.vo.js';
import type { CharacterCondition, Injury } from '../../../actor-rounds/domain/value-objects/injury.vo.js';

export type AttackType = 'melee' | 'ranged';

export interface CharacterPort {
  findById: (id: string) => Promise<Character | undefined>;

  findByGameId: (gameId: string) => Promise<Character[]>;
}

export const CHARACTER_PORT = Symbol('CharacterPort');

export interface Character {
  id: string;
  gameId: string;
  faction: ActorRoundFaction;
  name: string;
  info: CharacterInfo;
  /** Stats of the sheet by key (`st`, `ag`...). */
  statistics?: Partial<Record<string, CharacterStat>>;
  experience: CharacterExperience;
  movement: CharacterMovement;
  defense: CharacterDefense;
  hp: CharacterHP;
  initiative: CharacterInitiative;
  skills: CharacterSkill[];
  traits?: CharacterTrait[];
  /** Resistance roll bonuses (workspace spec 022 reads `totalBonus`); missing in older characters. */
  resistances?: CharacterResistance[];
  items: CharacterItem[];
  equipment: CharacterEquipment;
  /** Workspace spec 077: the endurance data the fatigue of a game reads. Missing in older strategic versions. */
  endurance?: CharacterEndurance;
  attacks: CharacterAttack[];
  /** Spec 013: missing in strategic versions before it. */
  injuries?: Injury[];
  /** Workspace spec 068, decision 19: lasting morale and fear RR modifiers, expired by strategic. */
  temporaryModifiers?: TemporaryModifier[];
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
  /** Size of the race. */
  sizeId: string;
  /**
   * Workspace spec 077, decision C13: the race size moved by Increased or Decreased Size, the size of the actor. Missing
   * in older strategic versions: `sizeId`.
   */
  effectiveSizeId?: string;
  /** Height in feet (workspace spec 077, block D). Missing in older strategic versions. */
  height?: number | null;
  /** Body weight in pounds (workspace spec 079, decision B2: feats of strength). */
  weight?: number | null;
}

/** A stat of the sheet: its total bonus (workspace spec 079, decision B2 reads the St one). */
export interface CharacterStat {
  totalBonus: number;
}

/** Workspace spec 077: endurance of the sheet (block D reads it). */
export interface CharacterEndurance {
  /** Accumulated fatigue penalty, 0-50, as a positive number. */
  fatiguePenalty?: number;
  /** Racial endurance bonus. */
  racialBonus?: number;
}

/** Workspace spec 077, decision B1.5: the load of the sheet, worn and carried, and its percent of the body weight. */
export interface CharacterLoad {
  worn: number;
  carried: number;
  percent: number;
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
  /** Fighting style skills only (workspace spec 032): abilities their ranks were allocated to, and the rest. */
  styleAbilities?: { abilityId: string; times: number; cost: number }[];
  styleFreeRanks?: number;
}

export interface CharacterResistance {
  resistance: string;
  totalBonus: number;
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
  /** Penalty of the load (workspace spec 077, decision B1.2: only the load, no longer the armour Enc %). */
  encumbrancePenalty: number;
  movementBaseDifficulty: string;
  /**
   * Workspace spec 077, decision B1.2: Enc % of the worn armour pieces that still protect (Spell Law Table 4-2). Missing
   * in older strategic versions: 0.
   */
  armorEncumbrance?: number;
  /** Workspace spec 077, decision B1.5. Missing in older strategic versions. */
  load?: CharacterLoad;
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
  /** Strategic item of the attack (spec 019). Missing in older characters: the item in the slot of `attackName`. */
  itemId?: string | null;
  /** Workspace spec 032: tags of the weapon type. Missing in older characters. */
  weaponTags?: string[];
  /** Workspace spec 040: times St enters the skill bonus of the attack. Missing in older characters. */
  strengthWeight?: number;
}

/** Conditions that keep a character out of a tactical game (spec 013, §3). */
const NOT_ABLE_CONDITIONS = ['permanent-unconscious', 'dead'];

/** The character is dead or permanently unconscious, and cannot take part in a tactical game. */
export const isCharacterNotAble = (character: Character): boolean =>
  character.status === 'dead' || (character.conditions || []).some(c => !c.resolvedAt && NOT_ABLE_CONDITIONS.includes(c.status));
