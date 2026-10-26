import { describe, expect, it } from 'vitest';
import {
  type ManeuverBaseInput,
  ManeuverBaseModifiersService,
} from '../../../../src/modules/actions/application/services/maneuver/maneuver-base-modifiers.service.js';
import type { Character } from '../../../../src/modules/strategic/application/ports/character.port.js';
import { load } from '../../actor-rounds/actor-round-test.factory.js';
import { action, movementAction, profile } from './maneuver-test.factory.js';

const service = new ManeuverBaseModifiersService();

const character = (overrides: Partial<Character> = {}): Character =>
  ({
    id: 'actor-1',
    skills: [
      { skillId: 'wall-scaling', specialization: null, totalBonus: 35, ranks: 4 },
      { skillId: 'old-lore', specialization: 'runes', totalBonus: 60, ranks: 8 },
    ],
    equipment: { slots: {}, maneuverPenalty: -30, encumbrancePenalty: -10, movementBaseDifficulty: 'm' },
    ...overrides,
  }) as unknown as Character;

const input = (overrides: Partial<ManeuverBaseInput> = {}): ManeuverBaseInput => ({
  actorRound: load(),
  character: character(),
  profile: profile(),
  skillId: 'wall-scaling',
  actionPoints: null,
  pace: null,
  includePace: true,
  ...overrides,
});

const keys = (overrides: Partial<ManeuverBaseInput>) =>
  Object.fromEntries(service.compute(input(overrides)).base.map(m => [m.key, m.value]));

describe('ManeuverBaseModifiersService', () => {
  it('adds the actor penalties as penalty-<source>, as the attacks do', () => {
    const actorRound = load({ hp: [100, 40], penalties: [['critical', -15]] });
    const result = service.compute(input({ actorRound }));
    expect(result.base).toEqual(
      expect.arrayContaining([
        { key: 'penalty-hp', value: -20, source: 'actor-round' },
        { key: 'penalty-injury', value: -15, source: 'actor-round' },
      ]),
    );
  });

  it('adds the fatigue penalty of the endurance rolls', () => {
    const actorRound = load();
    actorRound.applyEnduranceResult(10, 0);
    expect(keys({ actorRound })).toEqual({ 'penalty-fatigue': -10 });
  });

  it('applies armor and encumbrance only to maneuvers needing freedom of movement (criterion 2)', () => {
    expect(keys({ profile: profile({ movement: true }) })).toEqual({ 'armor-maneuver': -30, encumbrance: -10 });
    expect(keys({ profile: profile({ movement: false }) })).toEqual({});
  });

  it('adds the breakage the armor took in the game (spec 019)', () => {
    const actorRound = load();
    actorRound.initItems([
      {
        itemId: 'mail',
        name: 'Mail',
        kind: 'armor',
        slot: 'body',
        strength: 50,
        modifiers: [
          { id: 'old', type: 'breakage', value: -10, appliesTo: 'all', createdAt: '' },
          { id: 'new', type: 'breakage', value: -20, appliesTo: 'all', createdAt: '' },
        ],
        startModifierIds: ['old'],
        baseValue: 9,
      },
    ]);
    expect(keys({ actorRound, profile: profile({ movement: true }) })).toEqual({
      'armor-maneuver': -30,
      encumbrance: -10,
      'item-breakage': -20,
    });
  });

  it.each([
    ['creep', undefined],
    ['walk', -25],
    ['jog', -50],
    ['run', -75],
  ])('applies the pace penalty of %s (criterion 3)', (pace, value) => {
    expect(keys({ pace: pace as never }).pace).toBe(value);
  });

  it('skips the pace for the movement roll itself', () => {
    expect(keys({ pace: 'jog', includePace: false }).pace).toBeUndefined();
  });

  it('rejects other actions while sprinting or dashing, but lets an instantaneous one through', () => {
    expect(() => service.compute(input({ pace: 'sprint' }))).toThrow(expect.objectContaining({ code: 'err-maneuver-invalid-pace' }));
    expect(() => service.compute(input({ pace: 'dash' }))).toThrow(expect.objectContaining({ code: 'err-maneuver-invalid-pace' }));
    expect(keys({ pace: 'dash', freeAction: true }).pace).toBeUndefined();
  });

  it('takes -25 per AP below the maximum of the profile (criterion 4)', () => {
    const range = profile({ actionPoints: { min: 1, max: 4 } });
    expect(keys({ profile: range, actionPoints: 2 })['action-points']).toBe(-50);
    expect(keys({ profile: range, actionPoints: 4 })['action-points']).toBeUndefined();
    expect(keys({ profile: profile(), actionPoints: 1 })['action-points']).toBeUndefined();
  });

  it('treats a 0-2 AP range as any other: 0 AP gives -50 and 1 AP -25', () => {
    const range = profile({ actionPoints: { min: 0, max: 2 } });
    expect(keys({ profile: range, actionPoints: 0 })['action-points']).toBe(-50);
    expect(keys({ profile: range, actionPoints: 1 })['action-points']).toBe(-25);
  });

  it('reads the skill bonus with its specialization, and -25 without the skill (M7)', () => {
    expect(service.compute(input({ skillId: 'wall-scaling' })).skill).toEqual({
      skillId: 'wall-scaling',
      specialization: null,
      bonus: 35,
      ranks: 4,
      unskilled: false,
    });
    expect(service.compute(input({ skillId: 'old-lore', specialization: 'runes' })).skill.bonus).toBe(60);
    expect(service.compute(input({ skillId: 'old-lore', specialization: 'stars' })).skill).toMatchObject({ bonus: -25, unskilled: true });
    expect(service.compute(input({ skillId: 'unknown' })).skill).toMatchObject({ bonus: -25, ranks: 0, unskilled: true });
  });

  it('matches a skill the sheet keeps without specializations for any specialization', () => {
    expect(service.compute(input({ skillId: 'wall-scaling', specialization: 'trees' })).skill.bonus).toBe(35);
  });

  it('takes the fastest pace of the actor movement actions of the round', () => {
    const actions = [movementAction('walk', 'm1'), movementAction('run', 'm2'), action({ actionType: 'maneuver' })];
    expect(ManeuverBaseModifiersService.roundPace(actions, 'actor-1', 1)).toBe('run');
    expect(ManeuverBaseModifiersService.roundPace(actions, 'actor-1', 2)).toBeNull();
    expect(ManeuverBaseModifiersService.roundPace(actions, 'other', 1)).toBeNull();
  });
});

describe('fighting style bonuses (workspace spec 032)', () => {
  const styled = (abilities: { abilityId: string; met: boolean }[], met = true) => {
    const actorRound = load();
    actorRound.activeStyle = {
      skillId: 'battle-styles',
      styleId: 'made-up',
      met,
      attackNames: null,
      freeRanksBonus: 0,
      abilities: abilities.map(a => ({ ...a, times: 1, attackNames: null })),
      warnings: [],
      options: [],
    };
    return actorRound;
  };

  it('adds the fixed bonus of the active style to its skill', () => {
    const actorRound = styled([{ abilityId: 'experienced-rider', met: true }]);
    expect(keys({ actorRound, skillId: 'riding' })).toEqual({ 'style-ability-experienced-rider': 5 });
    expect(keys({ actorRound, skillId: 'mounted-combat' })).toEqual({ 'style-ability-experienced-rider': 10 });
    expect(keys({ actorRound, skillId: 'wall-scaling' })).toEqual({});
  });

  it('matches the specialization when the ability asks for one', () => {
    const actorRound = styled([
      { abilityId: 'aspect-of-fear', met: true },
      { abilityId: 'sharp-words', met: true },
    ]);
    expect(keys({ actorRound, skillId: 'influence', specialization: 'intimidation' })).toEqual({
      'style-ability-aspect-of-fear': 10,
      'style-ability-sharp-words': 10,
    });
    expect(keys({ actorRound, skillId: 'influence', specialization: 'diplomacy' })).toEqual({ 'style-ability-sharp-words': 10 });
  });

  it('gives nothing without the equipment of the style or of the ability', () => {
    expect(keys({ actorRound: styled([{ abilityId: 'disarming', met: true }], false), skillId: 'disarm' })).toEqual({});
    expect(keys({ actorRound: styled([{ abilityId: 'disarming', met: false }]), skillId: 'disarm' })).toEqual({});
  });
});
