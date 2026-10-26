import { describe, expect, it } from 'vitest';
import {
  castingColumn,
  castingSpellType,
  failurePowerPoints,
  failureRollModifier,
  needsPreparation,
  rrConditionModifiers,
  scrModifiers,
  scrResult,
  spellAllowsRr,
  spellResistanceRoll,
  type SpellcastingTables,
} from '../../../src/modules/actions/domain/services/spell-casting.rules.js';
import {
  type ActionSpellCaster,
  type ActionSpellInfo,
  DEFAULT_SPELL_OPTIONS,
} from '../../../src/modules/actions/domain/value-objects/action-spell.vo.js';
import { KeyValueModifier } from '../../../src/modules/actions/domain/value-objects/key-value-modifier.vo.js';

// Made-up numbers (not the book's Table 4-2): each column a different value to see which one is read.
const byColumn = (base: number) => ({
  channeling: base,
  essence: base - 1,
  mentalism: null,
  'channeling-essence': base - 2,
  'channeling-mentalism': base - 3,
  'essence-mentalism': base - 4,
});
const TABLES: SpellcastingTables = {
  columns: Object.keys(byColumn(0)),
  subtlety: { elemental: byColumn(-40), force: byColumn(-30), informational: byColumn(-10), utility: byColumn(-20) },
  hands: { none: byColumn(-50), one: byColumn(-10), two: byColumn(0) },
  voice: { none: byColumn(-60), whisper: byColumn(-15), normal: byColumn(0), shout: byColumn(10) },
  helmet: {
    light: { ...byColumn(0), mentalism: -21 },
    medium: { ...byColumn(0), mentalism: -41 },
    heavy: { ...byColumn(0), mentalism: -61 },
  },
  armor: {
    leather: { ...byColumn(0), essence: { perEncumbrancePercent: -4 } },
    metal: { ...byColumn(0), channeling: { perEncumbrancePercent: -3 }, essence: { perEncumbrancePercent: -4 } },
  },
  fastCastingPerAp: -25,
  overcastingPerLevel: -20,
  preparation: { perRound: 10, max: 20 },
};

const spell = (props: Partial<ActionSpellInfo> = {}): ActionSpellInfo => ({
  spellId: 'spell-1',
  name: 'Invented',
  level: 3,
  typeCode: 'E',
  type: 'elemental',
  subtype: null,
  instant: false,
  powerPoints: 3,
  listCode: 'invented-list',
  listName: 'Invented list',
  listRealms: ['essence'],
  resistance: null,
  range: null,
  area: null,
  duration: null,
  effects: [],
  ...props,
});

const caster = (props: Partial<ActionSpellCaster> = {}): ActionSpellCaster => ({
  realms: ['essence'],
  realmStatBonus: 6,
  level: 5,
  listSkillId: 'base-spell-list',
  ranks: 7,
  listTypeModifier: 5,
  ...props,
});

const keys = (modifiers: KeyValueModifier[]) => Object.fromEntries(modifiers.map(m => [m.key, m.value]));

describe('Spellcasting Roll modifiers (Spell Law 4.2)', () => {
  it('adds ranks, realm stat and list type, and leaves out what is 0', () => {
    const modifiers = scrModifiers(
      { spell: spell(), caster: caster({ realms: ['channeling'] }), options: DEFAULT_SPELL_OPTIONS, apPenalty: 0, penalties: [] },
      TABLES,
    );
    expect(keys(modifiers)).toEqual({ ranks: 7, 'realm-stat': 6, 'list-type': 5 });
  });

  it('reads the column of the caster realm, or of its hybrid', () => {
    const options = { ...DEFAULT_SPELL_OPTIONS, subtle: true, hands: 'none' as const, voice: 'whisper' as const };
    const input = { spell: spell(), options, apPenalty: 0, penalties: [] };
    expect(keys(scrModifiers({ ...input, caster: caster({ realms: ['channeling'] }) }, TABLES))).toMatchObject({
      subtlety: -40,
      hands: -50,
      voice: -15,
    });
    expect(keys(scrModifiers({ ...input, caster: caster({ realms: ['essence', 'channeling'] }) }, TABLES))).toMatchObject({
      subtlety: -42,
      hands: -52,
      voice: -17,
    });
    // Mentalism has no hands nor voice modifiers
    expect(keys(scrModifiers({ ...input, caster: caster({ realms: ['mentalism'] }) }, TABLES))).not.toHaveProperty('hands');
  });

  it('takes armor per encumbrance percent, helmets, fast casting, overcasting, preparation, penalties and the custom one', () => {
    const options = { ...DEFAULT_SPELL_OPTIONS, armor: 'metal' as const, armorEncumbrance: 12, preparationRounds: 3, customBonus: 7 };
    const modifiers = scrModifiers(
      { spell: spell({ level: 7 }), caster: caster(), options, apPenalty: -25, penalties: [{ source: 'hp', value: -10 }] },
      TABLES,
    );
    expect(keys(modifiers)).toMatchObject({
      armor: -48,
      'fast-casting': -25,
      overcasting: -40,
      preparation: 20,
      'penalty-hp': -10,
      custom: 7,
    });
    const helmet = scrModifiers(
      {
        spell: spell(),
        caster: caster({ realms: ['mentalism'] }),
        options: { ...DEFAULT_SPELL_OPTIONS, helmet: 'medium' },
        apPenalty: 0,
        penalties: [],
      },
      TABLES,
    );
    expect(keys(helmet)).toMatchObject({ helmet: -41 });
  });

  it('reads the result and the overcast preparation', () => {
    expect([scrResult(1), scrResult(0), scrResult(-1)]).toEqual(['success', 'no-effect', 'failure']);
    expect(needsPreparation(spell({ level: 6 }), caster())).toBe(true);
    expect(needsPreparation(spell({ level: 6, instant: true }), caster())).toBe(false);
    expect(needsPreparation(spell({ level: 5 }), caster())).toBe(false);
  });

  it('maps the spell types and the realm columns', () => {
    expect(castingSpellType('alchemical')).toBe('utility');
    expect(castingSpellType('force')).toBe('force');
    expect(castingColumn(['mentalism', 'essence'])).toBe('essence-mentalism');
  });
});

describe('spell failure (Spell Law 4.4)', () => {
  it('adds the net negative "other modifiers", with ranks and realm stat left out', () => {
    const modifiers = [
      new KeyValueModifier('ranks', 10),
      new KeyValueModifier('realm-stat', 5),
      new KeyValueModifier('list-type', 5),
      new KeyValueModifier('fast-casting', -25),
    ];
    expect(failureRollModifier(modifiers)).toBe(20);
    expect(failureRollModifier([new KeyValueModifier('list-type', 5)])).toBe(0);
  });

  it('turns the suggested power points into a number the caster has', () => {
    expect(
      ['none', 'one', 'half-down', 'half-up', 'normal', 'double', 'triple', 'all'].map(kind => failurePowerPoints(kind as never, 5, 40)),
    ).toEqual([0, 1, 2, 3, 5, 10, 15, 40]);
    expect(failurePowerPoints('triple', 5, 8)).toBe(8);
  });
});

describe('resistance rolls (Spell Law 4.5)', () => {
  it('applies Table 4-5 by realm', () => {
    const conditions = {
      willing: true,
      surprisedOrStunned: true,
      cover: 'full' as const,
      armor: 'organic' as const,
      helmet: 'metal' as const,
      range: 'touch' as const,
    };
    expect(rrConditionModifiers(conditions, 'essence')).toEqual([
      { key: 'willing', value: -50 },
      { key: 'surprised-stunned', value: -5 },
      { key: 'cover', value: 10 },
      { key: 'armor', value: 10 },
      { key: 'range', value: -15 },
    ]);
    expect(rrConditionModifiers({ armor: 'organic' }, 'channeling')).toEqual([]);
    expect(rrConditionModifiers({ armor: 'metal', range: 'far' }, 'channeling')).toEqual([
      { key: 'armor', value: 15 },
      { key: 'range', value: 10 },
    ]);
    expect(rrConditionModifiers({ helmet: 'organic', cover: 'partial', range: 'close' }, 'mentalism')).toEqual([
      { key: 'cover', value: 5 },
      { key: 'helmet', value: 10 },
      { key: 'range', value: -5 },
    ]);
  });

  it('resists when it reaches the SCR, and takes the better realm against a hybrid list', () => {
    const base = { roll: 40, casterLevel: 4, spellModifier: 0, conditions: {}, scr: 60 };
    expect(spellResistanceRoll({ ...base, bonuses: { essence: 28 }, listRealms: ['essence'] })).toMatchObject({
      total: 60,
      resisted: true,
      failure: 0,
    });
    const hybrid = spellResistanceRoll({ ...base, bonuses: { channeling: 5, essence: 15 }, listRealms: ['channeling', 'essence'] });
    expect(hybrid).toMatchObject({ realm: 'essence', total: 47, resisted: false, failure: 13 });
  });

  it('takes a roll against Force, Informational and Utility spells only', () => {
    expect(spellAllowsRr(spell({ resistance: { kind: 'realm', modifier: null, scaling: null } }))).toBe(true);
    expect(spellAllowsRr(spell({ resistance: { kind: 'none', modifier: null, scaling: null } }))).toBe(false);
    expect(spellAllowsRr(spell())).toBe(false);
  });
});
