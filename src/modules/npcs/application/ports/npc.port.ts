/** Reads the NPCs of rmu-api-npcs (spec 054) with the service token. */
export interface NpcPort {
  findById: (id: string) => Promise<Npc | undefined>;
}

export const NPC_PORT = Symbol('NpcPort');

/** Size ids of the stat block: the shared size scale (workspace spec 075), same ids as core. */
export { SIZE_IDS as CREATURE_SIZES, MEDIUM_SIZE_CLASS, sizeClassOf } from '../../../shared/domain/size-scale.js';

/** The NPC as the npcs API answers it: the fields tactical reads of its Combat Stat Block (spec 054). */
export interface Npc {
  id: string;
  /** Null (or absent) for a global NPC of the admins, valid in any campaign (spec 073). */
  realmId?: string | null;
  /** `public` or `private`: a private NPC is only readable by its owner. */
  accessType: string;
  name: string;
  /** Creature category (`animal`, `race`…), the race name of its actor. */
  category: string;
  type?: string | null;
  level: number;
  movement: NpcMovement[];
  /** Size id (`medium`, `big`…), see `CREATURE_SIZES`. */
  size: string;
  /** Size id it suffers criticals as (T-3.1d), when it differs from `size`; null or missing: its size. */
  criticalSize?: string | null;
  /** Critical codes of the stat block (T-3.1e); missing in NPCs read before spec 075. */
  criticalCodes?: NpcCriticalCodes | null;
  hp: number;
  /** Damage it dies at (the value in parentheses of the stat block); null when the block does not give it. */
  deathHits: number | null;
  at: number;
  db: number;
  shield: NpcShield | null;
  initiative: number;
  attacks: NpcAttack[];
  resistances: NpcResistances | null;
  /** Workspace spec 068, decision 17: fright level of the creature (Table 14-3a); null or missing when it has none. */
  frightLevel?: number | null;
  skills: NpcSkill[];
  /** Talents of the stat block; missing in NPCs read before workspace spec 076. */
  talents?: NpcTalent[] | null;
  imageUrl?: string | null;
  owner: string;
}

/** Critical codes (T-3.1e): only the ones tactical reads. */
export interface NpcCriticalCodes {
  /** Code I: the creature reduces the severity of any critical by one; below A it is not rolled. */
  reduceSeverity?: boolean;
}

export interface NpcMovement {
  mode: string;
  baseRate: number;
  /** `walk`, `jog`, `run`, `sprint` or `dash`. */
  maxPace: string;
}

/**
 * The shield of the stat block (ADR 0010): its type of Table 9-6 (`target`, `normal`, `full`, `wall`), the DB it adds
 * and the Shield skill of the creature. NPCs stored before spec 056 have no `db`: it is the one of the type.
 */
export interface NpcShield {
  type: string;
  db?: number | null;
  ranks: number | null;
  bonus: number | null;
}

/** Table 9-6: DB and attacks blocked per round of each shield type. */
export const SHIELD_TYPES: Readonly<Record<string, { db: number; blocks: number }>> = {
  target: { db: 15, blocks: 1 },
  normal: { db: 20, blocks: 2 },
  full: { db: 25, blocks: 3 },
  wall: { db: 30, blocks: 4 },
};

export interface NpcAttack {
  ob: number;
  /** Size class of the attack, 1-13 (medium = 5). */
  size: number;
  /** Null for an attack with no table of its own (`we`, `rw`, special attacks; spec 060). */
  attackTable: string | null;
  fumbleTable: string | null;
}

export interface NpcResistances {
  channeling: number;
  essence: number;
  mentalism: number;
  physical: number;
  fear: number;
}

export interface NpcSkill {
  skillId: string;
  specialization: string | null;
  ranks: number | null;
  /** Total bonus. */
  bonus: number;
}

/**
 * A talent of the stat block (workspace spec 076, §4): free text, with the id of the talent catalog when its name
 * matches one (`nightvision`, `acute-hearing`…). The tier is a roman numeral (`I`…`X`), or null.
 */
export interface NpcTalent {
  name: string;
  tier?: string | number | null;
  traitId?: string | null;
}

const ROMAN_TIERS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** Tier of a talent of the stat block: `I`…`X` (or a number) as 1…10; I when missing or unreadable. */
export function npcTalentTier(tier: string | number | null | undefined): number {
  if (typeof tier === 'number') return Number.isInteger(tier) && tier >= 1 ? tier : 1;
  if (typeof tier !== 'string') return 1;
  const index = ROMAN_TIERS.indexOf(tier.trim().toUpperCase());
  if (index >= 0) return index + 1;
  const parsed = Number(tier);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

/** The talents of the stat block that are in the talent catalog (with a `traitId`), with their tier. */
export function npcCatalogTalents(npc: Pick<Npc, 'talents'>): { traitId: string; tier: number }[] {
  return (npc.talents || []).flatMap(talent => (talent?.traitId ? [{ traitId: talent.traitId, tier: npcTalentTier(talent.tier) }] : []));
}
