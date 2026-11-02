import { KeyValueModifier, type ModifierGroup, type ModifierParams } from '../value-objects/key-value-modifier.vo.js';
import { SkippedRule } from '../value-objects/skipped-rule.vo.js';
import type {
  ActionSpellAttack,
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

/** Rule references of the spell rolls (Spell Law), shown with their explanation (workspace spec 052). */
export const SPELL_RULES = {
  casting: 'Spell Law §4.2',
  castingTable: 'Spell Law Table 4-2',
  fastCasting: 'Spell Law §4.2, Core Law §8.1',
  failure: 'Spell Law §4.4',
  resistance: 'Spell Law §4.5',
  resistanceTable: 'Spell Law Table 4-5',
} as const;

/** Phases of the rules a spell roll skips, as `SkippedRule.phase`. */
export const SPELL_CAST_PHASE = 'spell-cast';
export const SPELL_RR_PHASE = 'spell-rr';

/** A breakdown entry of a spell roll, with its explanation (workspace spec 052). */
export interface SpellRollModifier {
  key: string;
  value: number;
  group?: ModifierGroup;
  source?: string;
  rule?: string;
  params?: ModifierParams;
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
  /** AP of the action, for the explanation of the fast casting penalty. */
  actionPoints?: number;
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
  // Workspace spec 052: each modifier says its group, its rule and, for the table ones, the column read
  const skill = (key: string, value: number, params?: ModifierParams) =>
    new KeyValueModifier(key, value, 'skill', 'caster', SPELL_RULES.casting, params);
  const table = (key: string, value: number, params: ModifierParams) =>
    new KeyValueModifier(key, value, 'casting', 'casting-table', SPELL_RULES.castingTable, { ...params, column });
  const armorParams: ModifierParams = { armor: options.armor };
  if (typeof tables.armor[options.armor]?.[column] === 'object') armorParams.encumbrance = options.armorEncumbrance || 0;
  const modifiers: KeyValueModifier[] = [
    skill('ranks', caster.ranks, { ranks: caster.ranks, list: caster.listSkillId }),
    skill('realm-stat', caster.realmStatBonus, { realm: column }),
    skill('list-type', caster.listTypeModifier, { list: caster.listSkillId }),
    table('subtlety', options.subtle ? cell(tables.subtlety, spell.type) : 0, { type: spell.type }),
    table('hands', cell(tables.hands, options.hands), { hands: options.hands }),
    table('voice', cell(tables.voice, options.voice), { voice: options.voice }),
    table('helmet', options.helmet === 'none' ? 0 : cell(tables.helmet, options.helmet), { helmet: options.helmet }),
    table('armor', options.armor === 'none' ? 0 : cell(tables.armor, options.armor), armorParams),
    new KeyValueModifier(
      'fast-casting',
      input.apPenalty,
      'casting',
      'action-points',
      SPELL_RULES.fastCasting,
      input.actionPoints !== undefined ? { ap: input.actionPoints } : undefined,
    ),
    new KeyValueModifier('overcasting', overcastLevels * tables.overcastingPerLevel, 'casting', 'overcasting', SPELL_RULES.casting, {
      levels: overcastLevels,
      spellLevel: spell.level,
      casterLevel: caster.level,
    }),
    new KeyValueModifier('preparation', preparation, 'casting', 'preparation', SPELL_RULES.casting, {
      rounds: Math.max(0, options.preparationRounds || 0),
    }),
    ...input.penalties.map(penalty => new KeyValueModifier(`penalty-${penalty.source}`, penalty.value, 'penalty', 'actor-round')),
    new KeyValueModifier('custom', options.customBonus || 0, 'situation', 'custom'),
  ];
  return modifiers.filter(modifier => modifier.key === 'ranks' || modifier.value !== 0);
}

/**
 * Rules of the SCR the caster could expect that do not apply (workspace spec 052): a helmet or an armor that the
 * caster's realm column does not penalize, and the subtlety when the cast is not subtle.
 */
export function scrSkipped(input: ScrInput, tables: SpellcastingTables): SkippedRule[] {
  const { options } = input;
  const column = castingColumn(input.caster.realms);
  const skipped: SkippedRule[] = [];
  const free = (group: Partial<Record<string, ByColumn>>, key: string) => {
    const value = group[key]?.[column];
    return value === null || value === undefined || value === 0;
  };
  if (!options.subtle) {
    skipped.push(new SkippedRule('subtlety', 'casting', 'subtlety-not-requested', SPELL_CAST_PHASE, SPELL_RULES.castingTable));
  }
  if (options.helmet !== 'none' && free(tables.helmet, options.helmet)) {
    skipped.push(
      new SkippedRule('helmet', 'casting', 'helmet-no-penalty', SPELL_CAST_PHASE, SPELL_RULES.castingTable, {
        helmet: options.helmet,
        column,
      }),
    );
  }
  if (options.armor !== 'none' && free(tables.armor, options.armor)) {
    skipped.push(
      new SkippedRule('armor', 'casting', 'armor-no-penalty', SPELL_CAST_PHASE, SPELL_RULES.castingTable, { armor: options.armor, column }),
    );
  }
  return skipped;
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

/** Table 4-5 modifiers of a target against a spell of `realm`, with the condition that gives each one (spec 052). */
export function rrConditionModifiers(conditions: SpellTargetConditions, realm: SpellRealm): SpellRollModifier[] {
  const modifiers: SpellRollModifier[] = [];
  const target = (key: string, value: number, params?: ModifierParams): SpellRollModifier => ({
    key,
    value,
    group: 'target',
    source: 'target-conditions',
    rule: SPELL_RULES.resistanceTable,
    ...(params ? { params } : {}),
  });
  if (conditions.willing) modifiers.push(target('willing', RR_STATUS.willing));
  if (conditions.surprisedOrStunned) modifiers.push(target('surprised-stunned', RR_STATUS.surprisedOrStunned));
  const cover = conditions.cover ?? 'none';
  modifiers.push(target('cover', RR_COVER[cover], { cover }));
  if (realm === 'mentalism') {
    const helmet = conditions.helmet ?? 'none';
    modifiers.push(target('helmet', helmet === 'metal' ? 15 : helmet === 'organic' ? 10 : 0, { helmet, realm }));
  } else {
    const armor = conditions.armor ?? 'none';
    const organic = realm === 'essence' ? 10 : 0;
    modifiers.push(target('armor', armor === 'metal' ? 15 : armor === 'organic' ? organic : 0, { armor, realm }));
  }
  const range = conditions.range ?? 'normal';
  modifiers.push(target('range', RR_RANGE[range], { range }));
  return modifiers.filter(modifier => modifier.value !== 0);
}

/**
 * Table 4-5 conditions the target has that do not count against a spell of `realm` (spec 052): a helmet only protects
 * against Mentalism, a torso armor only against the other realms, and an organic one only against Essence.
 */
export function rrSkipped(conditions: SpellTargetConditions, realm: SpellRealm): SkippedRule[] {
  const skip = (source: string, reason: string, params: ModifierParams) =>
    new SkippedRule(source, 'target', reason, SPELL_RR_PHASE, SPELL_RULES.resistanceTable, params);
  const helmet = conditions.helmet ?? 'none';
  const armor = conditions.armor ?? 'none';
  const skipped: SkippedRule[] = [];
  if (realm === 'mentalism') {
    if (armor !== 'none') skipped.push(skip('armor', 'rr-armor-not-mentalism', { armor, realm }));
  } else {
    if (helmet !== 'none') skipped.push(skip('helmet', 'rr-helmet-only-mentalism', { helmet, realm }));
    if (armor === 'organic' && realm !== 'essence') skipped.push(skip('armor', 'rr-organic-only-essence', { armor, realm }));
  }
  return skipped;
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
  breakdown: SpellRollModifier[];
  skipped: SkippedRule[];
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
    const rule = SPELL_RULES.resistance;
    const entries: SpellRollModifier[] = [
      { key: 'roll', value: input.roll },
      { key: `${realm}-rr`, value: input.bonuses[realm] ?? 0, group: 'target', source: 'resistance', rule, params: { realm } },
      {
        key: 'caster-level',
        value: -2 * input.casterLevel,
        group: 'casting',
        source: 'caster',
        rule,
        params: { level: input.casterLevel },
      },
      { key: 'spell', value: input.spellModifier, group: 'casting', source: 'spell', rule },
      ...rrConditionModifiers(input.conditions, realm),
    ];
    const breakdown = entries.filter(modifier => modifier.key === 'roll' || modifier.value !== 0);
    const total = breakdown.reduce((sum, modifier) => sum + modifier.value, 0);
    return { realm, breakdown, total, skipped: rrSkipped(input.conditions, realm) };
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

/** The `attack` effect of a spell (spec 028), as rmu-api-spells returns it. */
export interface SpellAttackEffect {
  kind: 'attack';
  attackTable: string;
  attackSize?: 'small' | 'medium' | 'big' | null;
  criticalType?: string | null;
  ob?: 'directed-spells' | 'list-ranks' | null;
  radius?: number | null;
}

/** The caster's Directed Spells skill for a specialization: its ranks and total bonus. */
export interface DirectedSpellSkill {
  ranks: number;
  totalBonus: number;
}

const ATTACK_SIZE_STEPS = { small: -1, medium: 0, big: 1 };
/** Bonus of a skill without ranks (Table 3-0b). */
const UNSKILLED_BONUS = -25;
/** Directed Spell attacks: medium range up to 2x the short range, then long, extreme and absurd (Spell Law 2.4). */
const DIRECTED_RANGE_BONUSES = [0, -10, -25, -50, -100];
/** Bolts fumble on an unmodified 01-02, not reduced by the caster's ranks (RMCL 9.2). */
const BOLT_FUMBLE = 2;
/** Area spells fumble on an unmodified 01-02 (RMCL 9.3). */
const BALL_FUMBLE = 2;
const NO_RANGE_LIMIT = 10000;

/** The `attack` effect of a spell, if it has one. */
export function spellAttackEffect(effects: Record<string, unknown>[] | null | undefined): SpellAttackEffect | undefined {
  return (effects ?? []).find(effect => effect.kind === 'attack' && typeof effect.attackTable === 'string') as
    SpellAttackEffect | undefined;
}

/** Specialization of the Directed Spells skill that an attack table uses (core enumeration `skill-directed-spell`). */
export function directedSpellSpecialization(attackTable: string): string | null {
  if (attackTable.endsWith('-bolt')) return 'elemental-bolts';
  if (attackTable === 'sling' || attackTable === 'unarmed-strikes') return 'hurling';
  return null;
}

/**
 * The attack of an attack spell (Spell Law 4.3, RMCL 9.3), read by the combat engine as a ranged weapon:
 * - a bolt adds the caster's Directed Spells bonus for its table (unskilled -25), fumbles on an unmodified 1-2
 *   whatever its ranks (RMCL 9.2) and takes -10/-25/-50/-100 beyond its short range, one bracket per range increment;
 * - a ball (or cone) adds only the ranks in the list, fumbles on 1-2 and has no range modifier up to its range.
 */
export function spellAttackProfile(
  effect: SpellAttackEffect,
  range: Record<string, unknown> | null,
  listRanks: number,
  directed: DirectedSpellSkill | null,
): ActionSpellAttack {
  const ball = effect.ob === 'list-ranks' || /-ball$/.test(effect.attackTable);
  const specialization = directedSpellSpecialization(effect.attackTable);
  const increment = typeof range?.increment === 'number' ? range.increment : null;
  const distance = typeof range?.value === 'number' ? range.value : null;
  const ranges = ball
    ? [{ from: 0, to: distance ?? NO_RANGE_LIMIT, bonus: 0 }]
    : increment
      ? DIRECTED_RANGE_BONUSES.map((bonus, index) => ({ from: index * increment, to: (index + 1) * increment, bonus }))
      : [{ from: 0, to: distance ?? NO_RANGE_LIMIT, bonus: 0 }];
  return {
    kind: ball ? 'ball' : 'bolt',
    attackName: effect.attackTable,
    attackTable: effect.attackTable,
    attackSize: ATTACK_SIZE_STEPS[effect.attackSize ?? 'medium'] ?? 0,
    criticalType: effect.criticalType ?? null,
    fumbleTable: ball ? 'elemental-balls-cones' : 'elemental-bolts',
    fumble: ball ? BALL_FUMBLE : BOLT_FUMBLE,
    bo: ball ? listRanks : (directed?.totalBonus ?? UNSKILLED_BONUS),
    skillId: ball || !specialization ? null : `directed-spell@${specialization}`,
    ranges,
    radius: typeof effect.radius === 'number' ? effect.radius : null,
  };
}
