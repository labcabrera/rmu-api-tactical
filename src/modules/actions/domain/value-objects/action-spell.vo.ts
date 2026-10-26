import type { ActionRoll } from './action-roll.vo.js';

/** Realms of magic (Spell Law 2.1). */
export type SpellRealm = 'channeling' | 'essence' | 'mentalism';
export const SPELL_REALMS: SpellRealm[] = ['channeling', 'essence', 'mentalism'];

/** Spell types of the casting tables (Table 4-2 subtlety and Tables 4-4 columns). */
export type SpellType = 'elemental' | 'force' | 'informational' | 'utility';
export const SPELL_TYPES: SpellType[] = ['elemental', 'force', 'informational', 'utility'];

export type SpellHands = 'none' | 'one' | 'two';
export type SpellVoice = 'none' | 'whisper' | 'normal' | 'shout';
export type SpellHelmet = 'none' | 'light' | 'medium' | 'heavy';
export type SpellArmor = 'none' | 'leather' | 'metal';

export const SPELL_HANDS: SpellHands[] = ['none', 'one', 'two'];
export const SPELL_VOICES: SpellVoice[] = ['none', 'whisper', 'normal', 'shout'];
export const SPELL_HELMETS: SpellHelmet[] = ['none', 'light', 'medium', 'heavy'];
export const SPELL_ARMORS: SpellArmor[] = ['none', 'leather', 'metal'];

/** Spellcasting Roll result (Spell Law 4.2): above 0 succeeds, 0 fails without more, below 0 is a spell failure. */
export type SpellCastResult = 'success' | 'no-effect' | 'failure';

/** Power points a spell failure result takes, as the table suggests and the game master confirms (spec 030, decision 13). */
export type SpellFailurePp = 'none' | 'one' | 'half-down' | 'half-up' | 'normal' | 'double' | 'triple' | 'all';
export const SPELL_FAILURE_PP: SpellFailurePp[] = ['none', 'one', 'half-down', 'half-up', 'normal', 'double', 'triple', 'all'];

/** Resistance of a spell, as rmu-api-spells describes it (spec 028, decision 16). */
export interface SpellResistanceInfo {
  kind: string;
  modifier: number | null;
  scaling: string | null;
}

/** The spell cast, copied from the caster's spellbook at declaration (the catalog stays in rmu-api-spells). */
export interface ActionSpellInfo {
  spellId: string;
  name: string;
  level: number;
  /** Book type code (`F`, `Ed`, `Us`...). */
  typeCode: string | null;
  type: SpellType;
  subtype: string | null;
  instant: boolean;
  powerPoints: number;
  listCode: string;
  listName: string | null;
  /** Realms of the list: two for a hybrid list. */
  listRealms: SpellRealm[];
  resistance: SpellResistanceInfo | null;
  /** Range, area and duration as rmu-api-spells returns them. */
  range: Record<string, unknown> | null;
  area: Record<string, unknown> | null;
  duration: Record<string, unknown> | null;
  /** Declarative effects (spec 028); shown to the game master, not applied yet. */
  effects: Record<string, unknown>[];
}

/** What the caster brings to the roll, from strategic at declaration (spec 030, decision 5). */
export interface ActionSpellCaster {
  realms: SpellRealm[];
  realmStatBonus: number;
  level: number;
  /** Skill of the list: base, open, closed or restricted. */
  listSkillId: string;
  ranks: number;
  listTypeModifier: number;
}

/** Choices of the Spellcasting Roll (Table 4-2 and preparation). */
export interface ActionSpellOptions {
  subtle: boolean;
  hands: SpellHands;
  voice: SpellVoice;
  helmet: SpellHelmet;
  armor: SpellArmor;
  /** Encumbrance percent of the armor (helm included for Essence and Channeling). */
  armorEncumbrance: number;
  /** Rounds of preparation: +10 each, up to +20; an overcast non-instantaneous spell needs one. */
  preparationRounds: number;
  customBonus: number;
  customBonusNote?: string | null;
}

export const DEFAULT_SPELL_OPTIONS: ActionSpellOptions = {
  subtle: false,
  hands: 'two',
  voice: 'normal',
  helmet: 'none',
  armor: 'none',
  armorEncumbrance: 0,
  preparationRounds: 0,
  customBonus: 0,
  customBonusNote: null,
};

/** The spell failure roll (Spell Law 4.4, Tables 4-4). */
export interface ActionSpellFailure {
  realm: SpellRealm;
  roll: number;
  /** Net negative SCR modifiers, as a positive number (0 without them). */
  modifier: number;
  total: number;
  text: string;
  suggestedPp: SpellFailurePp;
}

/** Table 4-5 conditions of a target. */
export interface SpellTargetConditions {
  willing?: boolean;
  surprisedOrStunned?: boolean;
  cover?: 'none' | 'partial' | 'full';
  /** Torso armor (Essence, Channeling) or helmet (Mentalism) of the target. */
  armor?: 'none' | 'organic' | 'metal';
  helmet?: 'none' | 'organic' | 'metal';
  range?: 'touch' | 'close' | 'normal' | 'far';
}

/** The resistance roll of a target (Spell Law 4.5). */
export interface ActionSpellTarget {
  actorId: string;
  actorName?: string | null;
  /** False when the spell takes no roll for this target (a willing target of a Utility spell). */
  rolled: boolean;
  roll: number | null;
  conditions: SpellTargetConditions;
  breakdown: { key: string; value: number }[];
  total: number | null;
  /** The SCR the RR has to reach. */
  required: number;
  resisted: boolean;
  /** How much the RR fell short (0 when it resisted). */
  failure: number;
}

export interface ActionSpell {
  spell: ActionSpellInfo;
  caster: ActionSpellCaster;
  options?: ActionSpellOptions;
  roll?: ActionRoll;
  result?: SpellCastResult;
  failure?: ActionSpellFailure;
  targets?: ActionSpellTarget[];
  /** Power points taken from the caster when the cast was applied. */
  powerPointsSpent?: number | null;
}
