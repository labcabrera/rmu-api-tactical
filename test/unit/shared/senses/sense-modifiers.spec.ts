import { describe, expect, it } from 'vitest';
import {
  availableSenses,
  availableSenseSelections,
  type SenseChoices,
  senseModifiers,
  type SenseTrait,
  validateSenseChoices,
} from '../../../../src/modules/shared/domain/senses/sense-modifiers.js';
import { lightModifierValue, lightSensitivityPenalty } from '../../../../src/modules/actions/domain/value-objects/light-type.vo.js';

const trait = (traitId: string, tier = 1): SenseTrait => ({ traitId, tier });
const values = (traits: SenseTrait[], choices: SenseChoices = {}) =>
  Object.fromEntries(senseModifiers(traits, choices).map(modifier => [modifier.key, modifier.value]));

// Workspace spec 076, §3.1: one row per talent of the table.
describe('senseModifiers', () => {
  it.each([
    ['acute-hearing', 3, { sense: 'hearing' }, 15],
    ['acute-vision', 2, {}, 10],
    ['acute-smell', 1, { sense: 'smell' }, 5],
    ['acute-taste', 4, { sense: 'taste' }, 20],
    ['acute-touch', 5, { sense: 'touch' }, 25],
    ['poor-hearing', 2, { sense: 'hearing' }, -10],
    ['poor-vision', 3, {}, -15],
    ['poor-smell', 1, { sense: 'smell' }, -5],
    ['poor-taste', 1, { sense: 'taste' }, -5],
    ['poor-touch', 2, { sense: 'touch' }, -10],
    ['hearing-cat', 1, { sense: 'hearing', senseSelections: ['locate-sound'] }, 10],
    ['hearing-dog', 1, { sense: 'hearing' }, 10],
    ['hearing-hare', 1, { sense: 'hearing' }, 20],
    ['sight-gecko', 1, { sense: 'vision' }, 10],
    ['sight-eagle', 1, {}, 20],
    ['sight-hawk', 1, {}, 30],
    ['heatsense', 1, { sense: 'smell', senseSelections: ['warm-target'] }, 20],
    ['heatsense', 1, { senseSelections: ['warm-target'], heatsenseModifier: 5 }, 5],
    ['missing-sense-hearing', 1, { sense: 'hearing' }, -100],
    ['missing-sense-vision', 1, { senseUsage: 'helpful' }, -20],
    ['missing-sense-smell', 1, { sense: 'smell', senseUsage: 'helpful', missingSenseModifier: -50 }, -50],
    ['missing-sense-taste', 1, { sense: 'taste' }, -100],
    ['missing-sense-touch', 1, { sense: 'touch', senseUsage: 'required' }, -100],
    ['tetrachromatic-vision', 1, { senseSelections: ['hidden-target'] }, 30],
  ] as [string, number, SenseChoices, number][])('%s (tier %i) with %j: %i', (traitId, tier, choices, expected) => {
    expect(values([trait(traitId, tier)], choices)).toEqual({ [traitId]: expected });
  });

  it.each([
    ['acute-hearing', {}],
    ['poor-vision', { sense: 'hearing' }],
    ['hearing-cat', { sense: 'hearing' }],
    ['hearing-dog', {}],
    ['sight-hawk', { sense: 'hearing' }],
    ['heatsense', {}],
    ['missing-sense-hearing', {}],
    ['tetrachromatic-vision', { sense: 'hearing', senseSelections: ['hidden-target'] }],
    ['tetrachromatic-vision', {}],
    ['extra-sense', { sense: 'extra' }],
  ] as [string, SenseChoices][])('%s does not apply with %j', (traitId, choices) => {
    expect(values([trait(traitId, 3)], choices)).toEqual({});
  });

  it('adds every talent that applies, each with its rule reference', () => {
    const modifiers = senseModifiers([trait('acute-vision', 2), trait('sight-eagle'), trait('acute-hearing', 4)]);
    expect(modifiers).toEqual([
      { key: 'acute-vision', value: 10, rule: '§4.6', params: { tier: 2, sense: 'vision' } },
      { key: 'sight-eagle', value: 20, rule: '§4.5', params: { sense: 'vision' } },
    ]);
  });

  it('offers extra only with Extra Sense, and the selections of the talents of the actor', () => {
    expect(availableSenses([])).toEqual(['vision', 'hearing', 'smell', 'taste', 'touch']);
    expect(availableSenses([trait('extra-sense', 2)])).toContain('extra');
    expect(availableSenseSelections([trait('hearing-cat'), trait('heatsense')], true)).toEqual([
      'locate-sound',
      'warm-target',
      'within-darkvision',
    ]);
  });
});

describe('validateSenseChoices', () => {
  it('allows a sense only in Perception and Tracking', () => {
    expect(() => validateSenseChoices('climbing', [], { sense: 'hearing' })).toThrow(
      expect.objectContaining({ code: 'err-maneuver-sense-not-allowed' }),
    );
    expect(() => validateSenseChoices('climbing', [], undefined)).not.toThrow();
    expect(() => validateSenseChoices('tracking', [], { sense: 'smell' })).not.toThrow();
  });

  it('needs Extra Sense for the extra sense', () => {
    expect(() => validateSenseChoices('perception', [], { sense: 'extra' })).toThrow(
      expect.objectContaining({ code: 'err-maneuver-sense-missing-trait' }),
    );
    expect(() => validateSenseChoices('perception', [trait('extra-sense')], { sense: 'extra' })).not.toThrow();
  });

  it('keeps the values of Missing Sense and Heatsense in their range', () => {
    expect(() => validateSenseChoices('perception', [], { missingSenseModifier: -60 })).toThrow(
      expect.objectContaining({ code: 'err-maneuver-invalid-modifier' }),
    );
    expect(() => validateSenseChoices('perception', [], { heatsenseModifier: 25 })).toThrow(
      expect.objectContaining({ code: 'err-maneuver-invalid-modifier' }),
    );
  });
});

describe('light (Table 15-7)', () => {
  it('takes the full value where sight is required, half where it helps, the Nightvision column with the talent', () => {
    expect(lightModifierValue('dark', 'required')).toBe(-50);
    expect(lightModifierValue('dark', 'helpful')).toBe(-25);
    expect(lightModifierValue('dark', 'required', { nightvision: true })).toBe(-10);
    expect(lightModifierValue('extremely_dark', 'helpful', { nightvision: true })).toBe(-15);
    expect(lightModifierValue('pitch_black', 'required', { nightvision: true })).toBe(-100);
    expect(lightModifierValue('pitch_black', 'required', { withinDarkvision: true })).toBe(0);
    expect(lightModifierValue('dark', 'hiding', { nightvision: true })).toBe(25);
  });

  it('Light Sensitivity: -25 per tier in bright light, 25 less per level after it', () => {
    expect([0, 1, 2, 3, 4].map(index => lightSensitivityPenalty(LIGHTS[index], 2))).toEqual([-50, -25, 0, 0, 0]);
    expect([0, 1, 2, 3, 4].map(index => lightSensitivityPenalty(LIGHTS[index], 4))).toEqual([-100, -75, -50, -25, 0]);
    expect(lightSensitivityPenalty(null, 3)).toBe(0);
    expect(lightSensitivityPenalty('no_shadows', 0)).toBe(0);
  });
});

const LIGHTS = ['no_shadows', 'light_shadows', 'medium_shadows', 'heavy_shadows', 'dark'] as const;
