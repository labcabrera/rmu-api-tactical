import { ActorRoundTrait } from '../value-objects/actor-round-trait.vo.js';

/**
 * Workspace spec 079, D4 (Core Law ch. 4): Elemental Resistance and Elemental Susceptibility, taken for one element
 * (their `elemental-type` specialization). +5/-5 per tier to the DB, the RR and the Endurance against that element; a
 * fixed critical without a roll moves one severity per 2 tiers (down with Resistance, up with Susceptibility).
 */
export const ELEMENTAL_RESISTANCE = 'elemental-resistance';
export const ELEMENTAL_SUSCEPTIBILITY = 'elemental-susceptibility';

/** Bonus (or penalty) per tier. */
export const ELEMENTAL_PER_TIER = 5;
/** Tiers that move a fixed critical one severity. */
export const ELEMENTAL_TIERS_PER_SEVERITY = 2;
/** Rule reference of the breakdown lines. */
export const ELEMENTAL_RULE = 'Core Law ch. 4';

/**
 * Elements of the talents: the three of Core Law (cold, heat, electricity) and, decision ★, the extra ones of the Creature
 * Law stat blocks (water, earth, air), which no critical type gives (only a spell or a game master can name them).
 */
export const ELEMENTS = ['cold', 'heat', 'electricity', 'water', 'earth', 'air'] as const;
export type Element = (typeof ELEMENTS)[number];

/** Spellings of the specialization (the Core Law pairs, the Creature Law names) to an element. */
const ELEMENT_ALIASES: Record<string, Element> = {
  cold: 'cold',
  ice: 'cold',
  'cold-ice': 'cold',
  frost: 'cold',
  heat: 'heat',
  fire: 'heat',
  'heat-fire': 'heat',
  steam: 'heat',
  electricity: 'electricity',
  lightning: 'electricity',
  light: 'electricity',
  'electricity-light': 'electricity',
  water: 'water',
  earth: 'earth',
  air: 'air',
  wind: 'air',
};

/** The element of a specialization (any case, `/` or spaces as separators), null when it names none. */
export function elementOf(specialization: string | null | undefined): Element | null {
  if (!specialization) return null;
  const key = specialization
    .trim()
    .toLowerCase()
    .replace(/[\s/_]+/g, '-');
  return ELEMENT_ALIASES[key] ?? null;
}

/**
 * Element of a critical table (ch. 11): `H` heat, `O` cold, `L` electricity and, decision ★, steam as heat. Null for the
 * rest.
 */
export function elementOfCritical(criticalType: string | null | undefined): Element | null {
  switch (criticalType) {
    case 'H':
      return 'heat';
    case 'steam':
      return 'heat';
    case 'O':
      return 'cold';
    case 'L':
      return 'electricity';
    default:
      return null;
  }
}

/** Element of an attack table: the elemental bolts and balls (fire, cold, ice, lightning). Null for the rest. */
export function elementOfAttackTable(attackTable: string | null | undefined): Element | null {
  if (!attackTable) return null;
  if (/^fire-/.test(attackTable)) return 'heat';
  if (/^(cold|ice)-/.test(attackTable)) return 'cold';
  if (/^lightning-/.test(attackTable)) return 'electricity';
  return null;
}

/** The tiers of Resistance and Susceptibility the actor has for the element. */
export interface ElementalTiers {
  resistance: number;
  susceptibility: number;
}

export function elementalTiers(traits: ActorRoundTrait[] | undefined | null, element: Element | null): ElementalTiers {
  const tierOf = (traitId: string) =>
    (traits || [])
      .filter(trait => trait.traitId === traitId && elementOf(trait.specialization) === element)
      .reduce((max, trait) => Math.max(max, trait.tier || 1), 0);
  if (!element) return { resistance: 0, susceptibility: 0 };
  return { resistance: tierOf(ELEMENTAL_RESISTANCE), susceptibility: tierOf(ELEMENTAL_SUSCEPTIBILITY) };
}

/** +5 per tier of Resistance, -5 per tier of Susceptibility against the element: DB, RR and Endurance. */
export function elementalModifier(traits: ActorRoundTrait[] | undefined | null, element: Element | null): number {
  const { resistance, susceptibility } = elementalTiers(traits, element);
  return ELEMENTAL_PER_TIER * (resistance - susceptibility);
}

/** Severity steps of a fixed critical of the element: -1 per 2 tiers of Resistance, +1 per 2 of Susceptibility. */
export function elementalSeveritySteps(traits: ActorRoundTrait[] | undefined | null, element: Element | null): number {
  const { resistance, susceptibility } = elementalTiers(traits, element);
  return Math.floor(susceptibility / ELEMENTAL_TIERS_PER_SEVERITY) - Math.floor(resistance / ELEMENTAL_TIERS_PER_SEVERITY);
}

/** Params of a breakdown line: the element and the tiers that count. */
export function elementalParams(traits: ActorRoundTrait[] | undefined | null, element: Element): Record<string, string | number> {
  const { resistance, susceptibility } = elementalTiers(traits, element);
  return {
    element,
    ...(resistance ? { resistance } : {}),
    ...(susceptibility ? { susceptibility } : {}),
  };
}
