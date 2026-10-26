import { KeyValueModifier } from '../value-objects/key-value-modifier.vo.js';
import type {
  ActionSpellCaster,
  ActionSpellInfo,
  ActionSpellOptions,
  SpellCastResult,
  SpellFailurePp,
  SpellRealm,
  SpellTargetConditions,
  SpellType,
} from '../value-objects/action-spell.vo.js';
import { SPELL_REALMS } from '../value-objects/action-spell.vo.js';

/** A Table 4-2 cell: a modifier, a modifier per encumbrance percent, or null when it does not apply. */
export type SpellcastingCell = number | { perEncumbrancePercent: number } | null;
type ByColumn = Record<string, SpellcastingCell>;

/**
 * Spell Law Table 4-2 as rmu-api-attack-tables serves it (spec 030, decision 8): one column per realm and per hybrid
 * (`channeling-essence`...), and the per-unit modifiers.
 */
export interface SpellcastingTables {
  columns: string[];
  subtlety: Partial<Record<SpellType, ByColumn>>;
  hands: Partial<Record<string, ByColumn>>;
  voice: Partial<Record<string, ByColumn>>;
  helmet: Partial<Record<string, ByColumn>>;
  armor: Partial<Record<string, ByColumn>>;
  fastCastingPerAp: number;
  overcastingPerLevel: number;
  preparation: { perRound: number; max: number };
}

/** Modifier keys that are not "other modifiers" of the SCR: the spell failure roll leaves them out (Spell Law 4.4). */
const BASE_KEYS = ['ranks', 'realm-stat'];

/** Spell type of the casting tables: the two alchemical spells of the catalog read as Utility. */
export function castingSpellType(type: string | null | undefined): SpellType {
  return type === 'elemental' || type === 'force' || type === 'informational' ? type : 'utility';
}

/** Table 4-2 column of a caster: its realm, or its two realms in book order for a hybrid. */
export function castingColumn(realms: SpellRealm[]): string {
  return SPELL_REALMS.filter(realm => realms.includes(realm)).join('-');
}

export interface ScrInput {
  spell: ActionSpellInfo;
  caster: ActionSpellCaster;
  options: ActionSpellOptions;
  /** Fast casting: the AP penalty of the action (0 or negative). */
  apPenalty: number;
  /** General penalties of the actor (injuries, fatigue, hits, stun), one per source. */
  penalties: { source: string; value: number }[];
}

/**
 * Modifiers of the Spellcasting Roll (Spell Law 4.2): list ranks, realm stat and list type, then the "other modifiers"
 * of Table 4-2 for the caster's realm column, fast casting, overcasting, preparation, general penalties and the game
 * master's. Zero entries are left out, except the ranks.
 */
export function scrModifiers(input: ScrInput, tables: SpellcastingTables): KeyValueModifier[] {
  const { spell, caster, options } = input;
  const column = castingColumn(caster.realms);
  const cell = (group: Partial<Record<string, ByColumn>>, key: string): number => {
    const value = group[key]?.[column];
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    return Math.round(value.perEncumbrancePercent * Math.max(0, options.armorEncumbrance || 0));
  };
  const overcastLevels = Math.max(0, spell.level - caster.level);
  const preparation = Math.min(tables.preparation.max, Math.max(0, options.preparationRounds || 0) * tables.preparation.perRound);
  const modifiers: KeyValueModifier[] = [
    new KeyValueModifier('ranks', caster.ranks),
    new KeyValueModifier('realm-stat', caster.realmStatBonus),
    new KeyValueModifier('list-type', caster.listTypeModifier),
    new KeyValueModifier('subtlety', options.subtle ? cell(tables.subtlety, spell.type) : 0),
    new KeyValueModifier('hands', cell(tables.hands, options.hands)),
    new KeyValueModifier('voice', cell(tables.voice, options.voice)),
    new KeyValueModifier('helmet', options.helmet === 'none' ? 0 : cell(tables.helmet, options.helmet)),
    new KeyValueModifier('armor', options.armor === 'none' ? 0 : cell(tables.armor, options.armor)),
    new KeyValueModifier('fast-casting', input.apPenalty),
    new KeyValueModifier('overcasting', overcastLevels * tables.overcastingPerLevel),
    new KeyValueModifier('preparation', preparation),
    ...input.penalties.map(penalty => new KeyValueModifier(`penalty-${penalty.source}`, penalty.value)),
    new KeyValueModifier('custom', options.customBonus || 0),
  ];
  return modifiers.filter(modifier => modifier.key === 'ranks' || modifier.value !== 0);
}

/** An overcast spell (above the caster's level) that is not instantaneous needs a preparation round (Spell Law 4.2). */
export function needsPreparation(spell: ActionSpellInfo, caster: ActionSpellCaster): boolean {
  return spell.level > caster.level && !spell.instant;
}

/** Result of the Spellcasting Roll total (Spell Law 4.2). */
export function scrResult(total: number): SpellCastResult {
  if (total > 0) return 'success';
  return total === 0 ? 'no-effect' : 'failure';
}

/**
 * What the spell failure roll adds (Spell Law 4.4): the net sum of the modifiers that applied to the SCR, list ranks
 * and realm stat left out, with its sign changed; 0 when it was not negative.
 */
export function failureRollModifier(modifiers: KeyValueModifier[]): number {
  const net = modifiers.filter(modifier => !BASE_KEYS.includes(modifier.key)).reduce((sum, modifier) => sum + modifier.value, 0);
  return Math.max(0, -net);
}

/** Power points a spell failure result takes, never more than the caster has. */
export function failurePowerPoints(kind: SpellFailurePp, spellPowerPoints: number, current: number): number {
  const byKind: Record<SpellFailurePp, number> = {
    none: 0,
    one: 1,
    'half-down': Math.floor(spellPowerPoints / 2),
    'half-up': Math.ceil(spellPowerPoints / 2),
    normal: spellPowerPoints,
    double: spellPowerPoints * 2,
    triple: spellPowerPoints * 3,
    all: current,
  };
  return Math.max(0, Math.min(byKind[kind], current));
}

/** Table 4-5 (resistance roll modifiers): rule constants, as Table 9-7c of the protect penalties. */
const RR_STATUS = { willing: -50, surprisedOrStunned: -5 };
const RR_COVER = { none: 0, partial: 5, full: 10 };
const RR_RANGE = { touch: -15, close: -5, normal: 0, far: 10 };

/** Table 4-5 modifiers of a target against a spell of `realm`. */
export function rrConditionModifiers(conditions: SpellTargetConditions, realm: SpellRealm): { key: string; value: number }[] {
  const modifiers: { key: string; value: number }[] = [];
  if (conditions.willing) modifiers.push({ key: 'willing', value: RR_STATUS.willing });
  if (conditions.surprisedOrStunned) modifiers.push({ key: 'surprised-stunned', value: RR_STATUS.surprisedOrStunned });
  modifiers.push({ key: 'cover', value: RR_COVER[conditions.cover ?? 'none'] });
  if (realm === 'mentalism') {
    const helmet = conditions.helmet ?? 'none';
    modifiers.push({ key: 'helmet', value: helmet === 'metal' ? 15 : helmet === 'organic' ? 10 : 0 });
  } else {
    const armor = conditions.armor ?? 'none';
    const organic = realm === 'essence' ? 10 : 0;
    modifiers.push({ key: 'armor', value: armor === 'metal' ? 15 : armor === 'organic' ? organic : 0 });
  }
  modifiers.push({ key: 'range', value: RR_RANGE[conditions.range ?? 'normal'] });
  return modifiers.filter(modifier => modifier.value !== 0);
}

export interface SpellRrInput {
  roll: number;
  /** Resistance bonus of the target against each realm of the list. */
  bonuses: Partial<Record<SpellRealm, number>>;
  listRealms: SpellRealm[];
  casterLevel: number;
  /** RR modifier of the spell (spec 028). */
  spellModifier: number;
  conditions: SpellTargetConditions;
  /** The SCR of the cast: the RR has to reach it. */
  scr: number;
}

export interface SpellRrResult {
  realm: SpellRealm;
  breakdown: { key: string; value: number }[];
  total: number;
  resisted: boolean;
  failure: number;
}

/**
 * A resistance roll against a spell (Spell Law 4.5): d100OE + the target's RR bonus against the realm - 2 x caster
 * level + the spell's modifier + Table 4-5. Against a hybrid list the target takes the better of its two realms, after
 * every modifier. It resists when the total reaches the SCR.
 */
export function spellResistanceRoll(input: SpellRrInput): SpellRrResult {
  const results = input.listRealms.map(realm => {
    const breakdown = [
      { key: 'roll', value: input.roll },
      { key: `${realm}-rr`, value: input.bonuses[realm] ?? 0 },
      { key: 'caster-level', value: -2 * input.casterLevel },
      { key: 'spell', value: input.spellModifier },
      ...rrConditionModifiers(input.conditions, realm),
    ].filter(modifier => modifier.key === 'roll' || modifier.value !== 0);
    const total = breakdown.reduce((sum, modifier) => sum + modifier.value, 0);
    return { realm, breakdown, total };
  });
  const best = results.reduce((a, b) => (b.total > a.total ? b : a));
  const failure = Math.max(0, input.scr - best.total);
  return { ...best, resisted: failure === 0, failure };
}

/** The spell takes a resistance roll: Force and Informational spells with a target (spec 028, `resistance.kind`). */
export function spellAllowsRr(spell: ActionSpellInfo): boolean {
  const kind = spell.resistance?.kind;
  return kind === 'realm' || kind === 'informational' || kind === 'willing';
}
