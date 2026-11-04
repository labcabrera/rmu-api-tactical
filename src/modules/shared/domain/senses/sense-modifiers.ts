import { UnprocessableEntityError, ValidationError } from '../errors/errors.js';
import {
  ACUTE_HEARING,
  ACUTE_SMELL,
  ACUTE_TASTE,
  ACUTE_TOUCH,
  ACUTE_VISION,
  EXTRA_SENSE,
  HEARING_CAT,
  HEARING_DOG,
  HEARING_HARE,
  HEATSENSE,
  MISSING_SENSE_HEARING,
  MISSING_SENSE_SMELL,
  MISSING_SENSE_TASTE,
  MISSING_SENSE_TOUCH,
  MISSING_SENSE_VISION,
  POOR_HEARING,
  POOR_SMELL,
  POOR_TASTE,
  POOR_TOUCH,
  POOR_VISION,
  SIGHT_EAGLE,
  SIGHT_GECKO,
  SIGHT_HAWK,
  TETRACHROMATIC_VISION,
} from '../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';

/**
 * Senses of a Perception or Tracking maneuver (workspace spec 076, block C, ADR 0005). `extra` is the sense of the
 * Extra Sense talent: without it the maneuver is not allowed.
 */
export const SENSES = ['vision', 'hearing', 'smell', 'taste', 'touch', 'extra'] as const;
export type Sense = (typeof SENSES)[number];

/** The maneuver cannot be made without the sense (`required`), or the sense only helps it (`helpful`). */
export const SENSE_USAGES = ['required', 'helpful'] as const;
export type SenseUsage = (typeof SENSE_USAGES)[number];

/**
 * Situations the game master marks: locating a sound (Hearing, Cat), a warm or cold target close by (Heatsense), an
 * invisible or camouflaged target (Tetrachromatic Vision), the target within the range of Darkvision (10' per tier).
 */
export const SENSE_SELECTIONS = ['locate-sound', 'warm-target', 'hidden-target', 'within-darkvision'] as const;
export type SenseSelection = (typeof SENSE_SELECTIONS)[number];

/** Skills a sense can be chosen for. */
export const SENSE_SKILL_IDS = ['perception', 'tracking'];

export const DEFAULT_SENSE: Sense = 'vision';
export const DEFAULT_SENSE_USAGE: SenseUsage = 'required';

/** Missing Sense: on what requires the sense, and the range of what only benefits from it. */
export const MISSING_SENSE_REQUIRED = -100;
export const MISSING_SENSE_HELPFUL_DEFAULT = -20;
export const MISSING_SENSE_HELPFUL_MIN = -50;
/** Heatsense: up to +20, the game master adjusts it. */
export const HEATSENSE_MAX = 20;

const ACUTE_POOR_PER_TIER = 5;
const TETRACHROMATIC_BONUS = 30;

const SENSES_RULE = '§4.6';
const RACIAL_RULE = '§4.5';

/** The trait as the sense rules read it. */
export interface SenseTrait {
  traitId: string;
  tier: number;
}

/** What the client chose about the senses of the maneuver. */
export interface SenseChoices {
  sense?: Sense;
  senseUsage?: SenseUsage;
  senseSelections?: SenseSelection[];
  /** Missing Sense where the sense is helpful: -20 by default, -50 to -20. */
  missingSenseModifier?: number;
  /** Heatsense: +20 by default, 0 to 20. */
  heatsenseModifier?: number;
}

export interface SenseModifier {
  key: string;
  value: number;
  rule: string;
  params: Record<string, number | string>;
}

/** A modifier of the actor's talents and the conditions it needs, for the listing of a maneuver. */
export interface SenseModifierOption extends SenseModifier {
  /** Sense it applies to; any sense when missing (Heatsense). */
  sense?: Sense;
  /** Usage it applies to; any when missing. */
  usage?: SenseUsage;
  /** Selection it needs. */
  selection?: SenseSelection;
  /** Range of the value the game master may send (Missing Sense helpful, Heatsense). */
  min?: number;
  max?: number;
}

type PhysicalSense = Exclude<Sense, 'extra'>;

const ACUTE: Record<PhysicalSense, string> = {
  vision: ACUTE_VISION,
  hearing: ACUTE_HEARING,
  smell: ACUTE_SMELL,
  taste: ACUTE_TASTE,
  touch: ACUTE_TOUCH,
};
const POOR: Record<PhysicalSense, string> = {
  vision: POOR_VISION,
  hearing: POOR_HEARING,
  smell: POOR_SMELL,
  taste: POOR_TASTE,
  touch: POOR_TOUCH,
};
const MISSING: Record<PhysicalSense, string> = {
  vision: MISSING_SENSE_VISION,
  hearing: MISSING_SENSE_HEARING,
  smell: MISSING_SENSE_SMELL,
  taste: MISSING_SENSE_TASTE,
  touch: MISSING_SENSE_TOUCH,
};

/** Fixed bonuses of the racial hearing and sight talents, with the selection they need. */
const RACIAL: { traitId: string; sense: PhysicalSense; value: number; selection?: SenseSelection }[] = [
  { traitId: HEARING_CAT, sense: 'hearing', value: 10, selection: 'locate-sound' },
  { traitId: HEARING_DOG, sense: 'hearing', value: 10 },
  { traitId: HEARING_HARE, sense: 'hearing', value: 20 },
  { traitId: SIGHT_GECKO, sense: 'vision', value: 10 },
  { traitId: SIGHT_EAGLE, sense: 'vision', value: 20 },
  { traitId: SIGHT_HAWK, sense: 'vision', value: 30 },
];

const tierOf = (traits: SenseTrait[] | undefined, traitId: string): number =>
  (traits || []).filter(trait => trait.traitId === traitId).reduce((max, trait) => Math.max(max, trait.tier || 1), 0);

const PHYSICAL_SENSES = SENSES.filter((sense): sense is PhysicalSense => sense !== 'extra');

/** Every sense modifier the actor's talents can give, with the conditions each needs (the listing of a maneuver). */
export function senseModifierOptions(traits: SenseTrait[] | undefined): SenseModifierOption[] {
  const options: SenseModifierOption[] = [];
  for (const sense of PHYSICAL_SENSES) {
    const acute = tierOf(traits, ACUTE[sense]);
    if (acute > 0) {
      options.push({ key: ACUTE[sense], value: ACUTE_POOR_PER_TIER * acute, rule: SENSES_RULE, params: { tier: acute, sense }, sense });
    }
    const poor = tierOf(traits, POOR[sense]);
    if (poor > 0) {
      options.push({ key: POOR[sense], value: -ACUTE_POOR_PER_TIER * poor, rule: SENSES_RULE, params: { tier: poor, sense }, sense });
    }
  }
  for (const racial of RACIAL) {
    if (tierOf(traits, racial.traitId) > 0) {
      options.push({
        key: racial.traitId,
        value: racial.value,
        rule: RACIAL_RULE,
        params: { sense: racial.sense },
        sense: racial.sense,
        ...(racial.selection ? { selection: racial.selection } : {}),
      });
    }
  }
  if (tierOf(traits, HEATSENSE) > 0) {
    options.push({
      key: HEATSENSE,
      value: HEATSENSE_MAX,
      rule: RACIAL_RULE,
      params: {},
      selection: 'warm-target',
      min: 0,
      max: HEATSENSE_MAX,
    });
  }
  for (const sense of PHYSICAL_SENSES) {
    if (tierOf(traits, MISSING[sense]) > 0) {
      options.push(
        {
          key: MISSING[sense],
          value: MISSING_SENSE_REQUIRED,
          rule: SENSES_RULE,
          params: { sense, usage: 'required' },
          sense,
          usage: 'required',
        },
        {
          key: MISSING[sense],
          value: MISSING_SENSE_HELPFUL_DEFAULT,
          rule: SENSES_RULE,
          params: { sense, usage: 'helpful' },
          sense,
          usage: 'helpful',
          min: MISSING_SENSE_HELPFUL_MIN,
          max: MISSING_SENSE_HELPFUL_DEFAULT,
        },
      );
    }
  }
  if (tierOf(traits, TETRACHROMATIC_VISION) > 0) {
    options.push({
      key: TETRACHROMATIC_VISION,
      value: TETRACHROMATIC_BONUS,
      rule: RACIAL_RULE,
      params: { sense: 'vision' },
      sense: 'vision',
      selection: 'hidden-target',
    });
  }
  return options;
}

/** Senses the actor can choose: the five, and `extra` with the Extra Sense talent. */
export function availableSenses(traits: SenseTrait[] | undefined): Sense[] {
  return tierOf(traits, EXTRA_SENSE) > 0 ? [...SENSES] : [...PHYSICAL_SENSES];
}

/** Selections that change something for the actor: the ones of its talents (and Darkvision, read by the light). */
export function availableSenseSelections(traits: SenseTrait[] | undefined, hasDarkvision: boolean): SenseSelection[] {
  const selections = new Set(senseModifierOptions(traits).flatMap(option => (option.selection ? [option.selection] : [])));
  if (hasDarkvision) selections.add('within-darkvision');
  return SENSE_SELECTIONS.filter(selection => selections.has(selection));
}

/** Whether the request chose anything about the senses. */
export function hasSenseChoices(choices: SenseChoices | undefined): boolean {
  return (
    !!choices &&
    (choices.sense !== undefined ||
      choices.senseUsage !== undefined ||
      (choices.senseSelections?.length ?? 0) > 0 ||
      choices.missingSenseModifier !== undefined ||
      choices.heatsenseModifier !== undefined)
  );
}

/**
 * Checks the sense choices of a maneuver with the skill `skillId` (`err-maneuver-sense-not-allowed` outside Perception
 * and Tracking, `err-maneuver-sense-missing-trait` for `extra` without Extra Sense, `err-maneuver-invalid-modifier`
 * for values out of range).
 */
export function validateSenseChoices(skillId: string, traits: SenseTrait[] | undefined, choices: SenseChoices | undefined): void {
  if (!hasSenseChoices(choices)) return;
  if (!SENSE_SKILL_IDS.includes(skillId)) {
    throw new UnprocessableEntityError(
      `A sense is chosen only for Perception and Tracking, not ${skillId}`,
      'err-maneuver-sense-not-allowed',
      {
        skillId,
      },
    );
  }
  const { sense, senseUsage, senseSelections, missingSenseModifier, heatsenseModifier } = choices!;
  if (sense !== undefined && !SENSES.includes(sense)) {
    throw new ValidationError(`Unknown sense '${String(sense)}'`, 'err-maneuver-invalid-modifier');
  }
  if (senseUsage !== undefined && !SENSE_USAGES.includes(senseUsage)) {
    throw new ValidationError(`Unknown sense usage '${String(senseUsage)}'`, 'err-maneuver-invalid-modifier');
  }
  const unknown = (senseSelections || []).find(selection => !SENSE_SELECTIONS.includes(selection));
  if (unknown !== undefined) {
    throw new ValidationError(`Unknown sense selection '${String(unknown)}'`, 'err-maneuver-invalid-modifier');
  }
  if (sense === 'extra' && tierOf(traits, EXTRA_SENSE) === 0) {
    throw new UnprocessableEntityError('The actor has not the extra-sense talent', 'err-maneuver-sense-missing-trait', {
      traitId: EXTRA_SENSE,
    });
  }
  if (
    missingSenseModifier !== undefined &&
    (!Number.isFinite(missingSenseModifier) ||
      missingSenseModifier < MISSING_SENSE_HELPFUL_MIN ||
      missingSenseModifier > MISSING_SENSE_HELPFUL_DEFAULT)
  ) {
    throw new ValidationError(
      `Missing Sense where the sense helps goes from ${MISSING_SENSE_HELPFUL_MIN} to ${MISSING_SENSE_HELPFUL_DEFAULT}`,
      'err-maneuver-invalid-modifier',
    );
  }
  if (
    heatsenseModifier !== undefined &&
    (!Number.isFinite(heatsenseModifier) || heatsenseModifier < 0 || heatsenseModifier > HEATSENSE_MAX)
  ) {
    throw new ValidationError(`Heatsense goes from 0 to ${HEATSENSE_MAX}`, 'err-maneuver-invalid-modifier');
  }
}

/**
 * The modifiers of the actor's sense talents to a Perception or Tracking maneuver with the chosen sense, usage and
 * selections (workspace spec 076, §3.1). Pure: the choices are checked by `validateSenseChoices`.
 */
export function senseModifiers(traits: SenseTrait[] | undefined, choices: SenseChoices = {}): SenseModifier[] {
  const sense = choices.sense ?? DEFAULT_SENSE;
  const usage = choices.senseUsage ?? DEFAULT_SENSE_USAGE;
  const selections = new Set(choices.senseSelections || []);
  return senseModifierOptions(traits)
    .filter(
      option =>
        (option.sense === undefined || option.sense === sense) &&
        (option.usage === undefined || option.usage === usage) &&
        (option.selection === undefined || selections.has(option.selection)),
    )
    .map(option => {
      let value = option.value;
      if (option.key === HEATSENSE && choices.heatsenseModifier !== undefined) {
        value = choices.heatsenseModifier;
      } else if (option.usage === 'helpful' && choices.missingSenseModifier !== undefined) {
        value = choices.missingSenseModifier;
      }
      return { key: option.key, value, rule: option.rule, params: { ...option.params, ...(value !== option.value ? { value } : {}) } };
    })
    .filter(modifier => modifier.value !== 0);
}
