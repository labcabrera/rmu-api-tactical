/** Reads the NPCs of rmu-api-npcs (spec 054) with the service token. */
export interface NpcPort {
  findById: (id: string) => Promise<Npc | undefined>;
}

export const NPC_PORT = Symbol('NpcPort');

/** Size ids of the stat block, in order: the index + 1 is the size class (medium = 5). Same ids as core. */
export const CREATURE_SIZES = [
  'minuscule',
  'diminutive',
  'tiny',
  'small',
  'medium',
  'big',
  'large',
  'huge',
  'gigantic',
  'enormous',
  'immense',
  'behemoth',
  'leviathan',
] as const;

/** Size class of a medium creature. */
export const MEDIUM_SIZE_CLASS = 5;

/** Size class (1-13) of a size id of the stat block; undefined for an unknown one. */
export const sizeClassOf = (size: string): number | undefined => {
  const index = CREATURE_SIZES.indexOf(size as (typeof CREATURE_SIZES)[number]);
  return index < 0 ? undefined : index + 1;
};

/** The NPC as the npcs API answers it: the fields tactical reads of its Combat Stat Block (spec 054). */
export interface Npc {
  id: string;
  realmId: string;
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
  hp: number;
  /** Damage it dies at (the value in parentheses of the stat block); null when the block does not give it. */
  deathHits: number | null;
  at: number;
  db: number;
  shield: NpcShield | null;
  initiative: number;
  attacks: NpcAttack[];
  resistances: NpcResistances | null;
  skills: NpcSkill[];
  imageUrl?: string | null;
  owner: string;
}

export interface NpcMovement {
  mode: string;
  baseRate: number;
  /** `walk`, `jog`, `run`, `sprint` or `dash`. */
  maxPace: string;
}

export interface NpcShield {
  type: string;
  ranks: number;
  bonus: number;
}

export interface NpcAttack {
  ob: number;
  /** Size class of the attack, 1-13 (medium = 5). */
  size: number;
  attackTable: string;
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
