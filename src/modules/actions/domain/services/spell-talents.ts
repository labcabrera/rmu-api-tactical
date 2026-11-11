import {
  ELOQUENCE,
  EXTENDED_REACH,
  GRACEFUL_RECOVERY,
  INGLORIOUS_FAILURE,
  IRON_WILL,
  LACK_OF_SCOPE,
  LACK_OF_TIME,
  MUMBLER,
  PERFECTED_TECHNIQUE,
  POWER_RECYCLING,
  QUICK_CASTER,
  SCOPE_SKILLS,
  SPATIAL_SKILLS,
  TEMPORAL_SKILLS,
  ActorRoundTrait,
} from '../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import type { ActionSpellAdjusted, ActionSpellInfo, SpellAdjustmentSource, SpellCastResult } from '../value-objects/action-spell.vo.js';
import type { ManeuverActionPoints } from '../value-objects/maneuver-profile.vo.js';
import { KeyValueModifier } from '../value-objects/key-value-modifier.vo.js';
import type { SpellRollModifier } from './spell-casting.rules.js';
import {
  type Element,
  ELEMENTAL_RULE,
  elementalModifier,
  elementalParams,
  elementOfAttackTable,
  elementOfCritical,
} from '../../../actor-rounds/domain/services/elemental-talents.js';

/** Rule references of the magical talents (workspace spec 077, block C). */
export const SPELL_TALENT_RULES = {
  coreLaw: 'Core Law §4.3',
  companion: 'Character Companion §5.3',
  ironWill: 'Core Law §4.7',
} as const;

/** Per tier: Eloquence, Mumbler, Perfected Technique, Graceful Recovery, Inglorious Failure and Iron Will. */
const PER_TIER = 5;
/** Extended Reach: a touch spell reaches 5' per tier. */
const REACH_PER_TIER = 5;
/** Spatial and Temporal Skills: +50 % per tier; Scope Skills: +100 % per tier. */
const HALF_PER_TIER = 0.5;
/** A mental attack spell (rmu-api-spells subtype): Iron Will counts against it. */
export const MENTAL_ATTACK_SUBTYPE = 'mental-attack';

type Traits = ActorRoundTrait[] | undefined;

const kebab = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * A `spell-list` specialization of a trait names the list of the spell. Strategic stores the list code (the spell list
 * skill specialization, spec 029), which tactical copies as `listCode`; a list name typed instead (older data, free
 * text) matches it in kebab case.
 */
export const matchesSpellList = (
  specialization: string | null | undefined,
  spell: Pick<ActionSpellInfo, 'listCode' | 'listName'>,
): boolean => {
  if (!specialization) return false;
  if (specialization === spell.listCode) return true;
  const key = kebab(specialization);
  return key === kebab(spell.listCode) || (!!spell.listName && key === kebab(spell.listName));
};

/** Tier of a trait taken for the list of the spell, 0 without it. */
export const spellListTier = (traits: Traits, traitId: string, spell: Pick<ActionSpellInfo, 'listCode' | 'listName'>): number =>
  (traits || [])
    .filter(trait => trait.traitId === traitId && matchesSpellList(trait.specialization, spell))
    .reduce((max, trait) => Math.max(max, trait.tier || 1), 0);

/**
 * Decision C1: the `talent` entries of the Spellcasting Roll: Eloquence +5 and Mumbler -5 per tier, and Perfected
 * Technique +5 per tier for the list it was taken for. They are "other modifiers", so they count in the spell failure
 * roll too (P7).
 */
export function scrTalentModifiers(traits: Traits, spell: Pick<ActionSpellInfo, 'listCode' | 'listName'>): KeyValueModifier[] {
  const talent = (key: string, value: number, rule: string, params: Record<string, number | string>) =>
    new KeyValueModifier(key, value, 'talent', 'talents', rule, params);
  const eloquence = ActorRoundTrait.tierOf(traits, ELOQUENCE);
  const mumbler = ActorRoundTrait.tierOf(traits, MUMBLER);
  const perfected = spellListTier(traits, PERFECTED_TECHNIQUE, spell);
  const modifiers: KeyValueModifier[] = [];
  if (eloquence) modifiers.push(talent(ELOQUENCE, PER_TIER * eloquence, SPELL_TALENT_RULES.coreLaw, { tier: eloquence }));
  if (mumbler) modifiers.push(talent(MUMBLER, -PER_TIER * mumbler, SPELL_TALENT_RULES.coreLaw, { tier: mumbler }));
  if (perfected) {
    modifiers.push(
      talent(PERFECTED_TECHNIQUE, PER_TIER * perfected, SPELL_TALENT_RULES.companion, { tier: perfected, list: spell.listCode }),
    );
  }
  return modifiers;
}

/** Decision C2: what the talents add to the spell failure roll: +5 per tier of Inglorious Failure, -5 of Graceful Recovery. */
export const failureTalentModifier = (traits: Traits): number =>
  PER_TIER * (ActorRoundTrait.tierOf(traits, INGLORIOUS_FAILURE) - ActorRoundTrait.tierOf(traits, GRACEFUL_RECOVERY));

/** The total of the spell failure roll is never below 1 (decision C2). */
export const MIN_FAILURE_TOTAL = 1;

export interface PowerRecycling {
  /** Power points the proposal takes. */
  charged: number;
  /** Power points the talent saves. */
  recycled: number;
}

/**
 * Decision C3 (P8): with Power Recycling, a cast that fails (`failure` or `no-effect`) takes half the power points it
 * would take without the talent, rounded in favour of the caster (I), or none (II). Undefined when it does not apply.
 */
export function powerRecycling(traits: Traits, result: SpellCastResult | undefined, base: number): PowerRecycling | undefined {
  const tier = ActorRoundTrait.tierOf(traits, POWER_RECYCLING);
  if (!tier || (result !== 'failure' && result !== 'no-effect')) return undefined;
  const charged = tier >= 2 ? 0 : Math.floor(Math.max(0, base) / 2);
  return { charged, recycled: Math.max(0, base) - charged };
}

/** Decision C4: Quick-Caster for the list makes a cast take 2-3 AP (I) or 2 AP (II) instead of 2-4; null without it. */
export function quickCasterApRange(traits: Traits, spell: Pick<ActionSpellInfo, 'listCode' | 'listName'>): ManeuverActionPoints | null {
  const tier = spellListTier(traits, QUICK_CASTER, spell);
  if (!tier) return null;
  return tier >= 2 ? { min: 2, max: 2 } : { min: 2, max: 3 };
}

/** The multipliers of the talents of a cast (decision C5). */
interface SpellScaling {
  range: number;
  /** Extended Reach: the feet a touch spell reaches, 0 without it. */
  reach: number;
  area: number;
  areaHalved: boolean;
  duration: number;
  durationHalved: boolean;
  sources: SpellAdjustmentSource[];
}

function spellScaling(traits: Traits, spell: Pick<ActionSpellInfo, 'listCode' | 'listName' | 'range'>): SpellScaling {
  const spatial = spellListTier(traits, SPATIAL_SKILLS, spell);
  const reach = spellListTier(traits, EXTENDED_REACH, spell);
  const scope = spellListTier(traits, SCOPE_SKILLS, spell);
  const temporal = spellListTier(traits, TEMPORAL_SKILLS, spell);
  const lackOfScope = ActorRoundTrait.tierOf(traits, LACK_OF_SCOPE);
  const lackOfTime = ActorRoundTrait.tierOf(traits, LACK_OF_TIME);
  const sources: SpellAdjustmentSource[] = [];
  const source = (traitId: string, tier: number, ...applies: SpellAdjustmentSource['applies'][]) =>
    tier && applies.forEach(each => sources.push({ traitId, tier, applies: each }));
  const touch = spell.range?.type === 'touch';
  source(SPATIAL_SKILLS, touch ? 0 : spatial, 'range');
  source(EXTENDED_REACH, touch ? reach : 0, 'range');
  source(SCOPE_SKILLS, scope, 'area', 'targets');
  source(LACK_OF_SCOPE, lackOfScope, 'area', 'targets');
  source(TEMPORAL_SKILLS, temporal, 'duration');
  source(LACK_OF_TIME, lackOfTime, 'duration');
  return {
    range: 1 + HALF_PER_TIER * spatial,
    reach: touch ? REACH_PER_TIER * reach : 0,
    area: 1 + scope,
    areaHalved: lackOfScope > 0,
    duration: 1 + HALF_PER_TIER * temporal,
    durationHalved: lackOfTime > 0,
    sources,
  };
}

/** A value scaled by a talent, in whole units; halved by a Lack of flaw rounding up. */
const scale = (value: unknown, factor: number, halved = false): unknown => {
  if (typeof value !== 'number') return value;
  const scaled = Math.round(value * factor);
  return halved ? Math.ceil(scaled / 2) : scaled;
};

const scaleRange = (range: Record<string, unknown> | null, scaling: SpellScaling): Record<string, unknown> | null => {
  if (!range) return range;
  if (scaling.reach > 0) return { ...range, type: 'distance', value: scaling.reach, increment: null, raw: `${scaling.reach}'` };
  if (scaling.range === 1) return range;
  return { ...range, value: scale(range.value, scaling.range), increment: scale(range.increment, scaling.range) };
};

const scaleArea = (area: Record<string, unknown> | null, scaling: SpellScaling): Record<string, unknown> | null => {
  if (!area || (scaling.area === 1 && !scaling.areaHalved)) return area;
  return {
    ...area,
    radius: scale(area.radius, scaling.area, scaling.areaHalved),
    count: scale(area.count, scaling.area, scaling.areaHalved),
  };
};

const scaleDuration = (duration: Record<string, unknown> | null, scaling: SpellScaling): Record<string, unknown> | null => {
  if (!duration || (scaling.duration === 1 && !scaling.durationHalved)) return duration;
  return {
    ...duration,
    value: scale(duration.value, scaling.duration, scaling.durationHalved),
    perLevel: scale(duration.perLevel, scaling.duration, scaling.durationHalved),
    perFailure: scale(duration.perFailure, scaling.duration, scaling.durationHalved),
  };
};

/**
 * Decision C5: the range, area and duration of a spell with the caster's talents, at declaration:
 * - Spatial Skills: x(1 + 0.5 x tier) to the range and its increments; Extended Reach: a touch spell reaches 5' x tier;
 * - Scope Skills: x(1 + tier) to the radius and the number of targets;
 * - Temporal Skills: x(1 + 0.5 x tier) to the duration;
 * - Lack of Scope and Lack of Time: half the area and the duration, rounding up.
 * Scaled values are rounded to whole units. Null when no talent changes the spell.
 */
export function adjustSpell(traits: Traits, spell: ActionSpellInfo): ActionSpellAdjusted | null {
  const scaling = spellScaling(traits, spell);
  if (scaling.sources.length === 0) return null;
  return {
    range: scaleRange(spell.range, scaling),
    area: scaleArea(spell.area, scaling),
    duration: scaleDuration(spell.duration, scaling),
    sources: scaling.sources,
  };
}

/** Decision C6: the radius of a ball with Scope Skills and Lack of Scope. */
export function adjustRadius(traits: Traits, spell: ActionSpellInfo, radius: number | null): number | null {
  if (radius === null) return null;
  const scaling = spellScaling(traits, spell);
  return scale(radius, scaling.area, scaling.areaHalved) as number;
}

/** Decision C6: the targets a bolt can strike, 1 + the tier of Scope Skills for the list. */
export const boltMaxTargets = (traits: Traits, spell: Pick<ActionSpellInfo, 'listCode' | 'listName'>): number =>
  1 + spellListTier(traits, SCOPE_SKILLS, spell);

/**
 * P9: the OB of a bolt split among its targets: as `obSplit` says, or in equal parts (the remainder to the first ones).
 * An OB of 0 or less is not split: every target takes it.
 */
export function splitBoltOb(bo: number, targets: number, obSplit?: number[] | null): number[] {
  if (obSplit && obSplit.length > 0) return [...obSplit];
  if (bo <= 0 || targets <= 1) return Array.from({ length: targets }, () => bo);
  const share = Math.floor(bo / targets);
  const remainder = bo - share * targets;
  return Array.from({ length: targets }, (_, index) => share + (index < remainder ? 1 : 0));
}

/** Decision C9: Iron Will, +5 per tier to the RR of a target against a mental attack spell of any realm. */
export function ironWillModifier(traits: Traits, spell: Pick<ActionSpellInfo, 'subtype'>): SpellRollModifier | undefined {
  const tier = ActorRoundTrait.tierOf(traits, IRON_WILL);
  if (!tier || spell.subtype !== MENTAL_ATTACK_SUBTYPE) return undefined;
  return {
    key: IRON_WILL,
    value: PER_TIER * tier,
    group: 'talent',
    source: 'talents',
    rule: SPELL_TALENT_RULES.ironWill,
    params: { tier },
  };
}

/**
 * Element of a spell (workspace spec 079, D4): the critical type of any of its effects (`H` and steam heat, `O` cold,
 * `L` electricity), else its elemental attack table. Null for the rest: the game master applies them by hand.
 */
export function spellElement(spell: Pick<ActionSpellInfo, 'effects'>): Element | null {
  for (const effect of spell.effects ?? []) {
    const element =
      elementOfCritical(effect.criticalType as string | undefined) ?? elementOfAttackTable(effect.attackTable as string | undefined);
    if (element) return element;
  }
  return null;
}

/**
 * Workspace spec 079, D4: Elemental Resistance (+5 per tier) and Susceptibility (-5 per tier) of the target to the RR
 * against a spell of its element.
 */
export function elementalRrModifier(traits: Traits, spell: Pick<ActionSpellInfo, 'effects'>): SpellRollModifier | undefined {
  const element = spellElement(spell);
  const value = elementalModifier(traits, element);
  if (!element || !value) return undefined;
  return {
    key: 'elemental-talent',
    value,
    group: 'talent',
    source: 'talents',
    rule: ELEMENTAL_RULE,
    params: elementalParams(traits, element),
  };
}
