// Workspace spec 077, block C: the magical talents in the spell casting, with made-up spells and numbers.
import { describe, expect, it } from 'vitest';
import { ActorRoundTrait } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import {
  failureRollModifier,
  scrModifiers,
  type SpellcastingTables,
  spellAttackProfile,
  spellResistanceRoll,
} from '../../../src/modules/actions/domain/services/spell-casting.rules.js';
import {
  adjustRadius,
  adjustSpell,
  boltMaxTargets,
  failureTalentModifier,
  ironWillModifier,
  matchesSpellList,
  powerRecycling,
  quickCasterApRange,
  splitBoltOb,
} from '../../../src/modules/actions/domain/services/spell-talents.js';
import { ActionApProfile } from '../../../src/modules/actions/domain/value-objects/action-ap-profile.vo.js';
import {
  type ActionSpellCaster,
  type ActionSpellInfo,
  DEFAULT_SPELL_OPTIONS,
} from '../../../src/modules/actions/domain/value-objects/action-spell.vo.js';

const zero = { channeling: 0, essence: 0, mentalism: 0 };
const TABLES: SpellcastingTables = {
  columns: Object.keys(zero),
  subtlety: {},
  hands: { two: zero },
  voice: { normal: zero },
  helmet: {},
  armor: {},
  fastCastingPerAp: -25,
  overcastingPerLevel: -20,
  preparation: { perRound: 10, max: 20 },
};

const spell = (props: Partial<ActionSpellInfo> = {}): ActionSpellInfo => ({
  spellId: 'spell-1',
  name: 'Invented',
  level: 1,
  typeCode: 'E',
  type: 'elemental',
  subtype: null,
  instant: false,
  powerPoints: 5,
  listCode: 'invented-list',
  listName: 'Invented List',
  listRealms: ['essence'],
  resistance: null,
  range: { type: 'distance', value: 100, perLevel: false, increment: null, raw: "100'" },
  area: { kind: 'radius', count: null, radius: 10, raw: "10'R" },
  duration: { type: 'per-level', value: 1, scale: 'minute', perLevel: 1, perFailure: null, raw: '1 min/lvl' },
  effects: [],
  ...props,
});

const caster: ActionSpellCaster = {
  realms: ['essence'],
  realmStatBonus: 0,
  level: 5,
  listSkillId: 'base-spell-list',
  ranks: 5,
  listTypeModifier: 0,
};

const trait = (traitId: string, tier = 1, specialization: string | null = null) => new ActorRoundTrait(traitId, tier, specialization);

const scr = (traits: ActorRoundTrait[], props: Partial<ActionSpellInfo> = {}) =>
  scrModifiers({ spell: spell(props), caster, options: DEFAULT_SPELL_OPTIONS, apPenalty: 0, penalties: [], traits }, TABLES);

describe('magical talents in the Spellcasting Roll (decision C1)', () => {
  it('adds Eloquence II as +10 in the talent group', () => {
    expect(scr([trait('eloquence', 2)]).find(modifier => modifier.key === 'eloquence')).toMatchObject({
      value: 10,
      group: 'talent',
      source: 'talents',
      params: { tier: 2 },
    });
  });

  it('takes Mumbler as -5 per tier, and Perfected Technique only for its list', () => {
    const keys = (traits: ActorRoundTrait[]) => Object.fromEntries(scr(traits).map(modifier => [modifier.key, modifier.value]));

    expect(keys([trait('mumbler', 3)])).toMatchObject({ mumbler: -15 });
    expect(keys([trait('perfected-technique', 2, 'invented-list')])).toMatchObject({ 'perfected-technique': 10 });
    expect(keys([trait('perfected-technique', 2, 'another-list')])['perfected-technique']).toBeUndefined();
  });

  it('counts them in the spell failure roll as other modifiers (P7)', () => {
    expect(failureRollModifier(scr([trait('mumbler', 2)]))).toBe(10);
    expect(failureRollModifier(scr([trait('eloquence', 2), trait('mumbler', 1)]))).toBe(0);
  });

  it('matches a list by its code, or by its name or code in kebab case', () => {
    const listOf = spell({ listCode: 'invented-list', listName: 'Invented List' });

    expect(matchesSpellList('invented-list', listOf)).toBe(true);
    expect(matchesSpellList('Invented List', listOf)).toBe(true);
    expect(matchesSpellList('other-list', listOf)).toBe(false);
    expect(matchesSpellList(null, listOf)).toBe(false);
  });
});

describe('spell failure roll talents (decision C2)', () => {
  it('Graceful Recovery lowers 5 per tier and Inglorious Failure raises 5 per tier', () => {
    expect(failureTalentModifier([trait('graceful-recovery', 3)])).toBe(-15);
    expect(failureTalentModifier([trait('inglorious-failure', 2)])).toBe(10);
    expect(failureTalentModifier([])).toBe(0);
  });
});

describe('Power Recycling (decision C3, P8)', () => {
  it('tier I takes half of the power points of a failed cast, in favour of the caster', () => {
    expect(powerRecycling([trait('power-recycling', 1)], 'failure', 5)).toEqual({ charged: 2, recycled: 3 });
    expect(powerRecycling([trait('power-recycling', 1)], 'no-effect', 4)).toEqual({ charged: 2, recycled: 2 });
  });

  it('tier II takes none, and a success or a caster without it are not changed', () => {
    expect(powerRecycling([trait('power-recycling', 2)], 'failure', 10)).toEqual({ charged: 0, recycled: 10 });
    expect(powerRecycling([trait('power-recycling', 1)], 'success', 5)).toBeUndefined();
    expect(powerRecycling([], 'failure', 5)).toBeUndefined();
  });
});

describe('Quick-Caster (decision C4)', () => {
  it('casts a spell of its list in 2-3 AP (I), so 3 AP take no penalty, or in 2 AP (II)', () => {
    const range = quickCasterApRange([trait('quick-caster', 1, 'invented-list')], spell())!;
    const profile = new ActionApProfile(range.min, range.max, ActionApProfile.forAction('cast_spell').penaltyPerMissing);

    expect(range).toEqual({ min: 2, max: 3 });
    expect(profile.penaltyFor(3)).toBe(0);
    expect(profile.penaltyFor(2)).toBe(-25);
    expect(quickCasterApRange([trait('quick-caster', 2, 'invented-list')], spell())).toEqual({ min: 2, max: 2 });
    expect(quickCasterApRange([trait('quick-caster', 2, 'another-list')], spell())).toBeNull();
  });
});

describe('adjusted range, area and duration (decision C5)', () => {
  it('Spatial Skills II doubles the range and its brackets', () => {
    const bolt = spell({ range: { type: 'distance', value: null, perLevel: false, increment: 25, raw: "<25'>" } });

    const adjusted = adjustSpell([trait('spatial-skills', 2, 'invented-list')], bolt)!;

    expect(adjusted.range).toMatchObject({ type: 'distance', increment: 50 });
    expect(adjusted.sources).toEqual([{ traitId: 'spatial-skills', tier: 2, applies: 'range' }]);
  });

  it('Extended Reach takes a touch spell to 5 feet per tier', () => {
    const touch = spell({ range: { type: 'touch', value: null, perLevel: false, increment: null, raw: 'touch' } });

    expect(adjustSpell([trait('extended-reach', 3, 'invented-list')], touch)!.range).toMatchObject({ type: 'distance', value: 15 });
  });

  it('Scope Skills multiplies radius and targets by 1 + tier, Temporal Skills the duration by 1 + 0.5 x tier', () => {
    const adjusted = adjustSpell([trait('scope-skills', 1, 'invented-list'), trait('temporal-skills', 2, 'invented-list')], spell())!;

    expect(adjusted.area).toMatchObject({ radius: 20 });
    expect(adjusted.duration).toMatchObject({ value: 2, perLevel: 2 });
  });

  it('Lack of Scope and Lack of Time halve the area and the duration of every spell, rounding up', () => {
    const adjusted = adjustSpell(
      [trait('lack-of-scope'), trait('lack-of-time')],
      spell({ area: { kind: 'targets', count: 3, radius: null }, duration: { type: 'fixed', value: 5, scale: 'round' } }),
    )!;

    expect(adjusted.area).toMatchObject({ count: 2, radius: null });
    expect(adjusted.duration).toMatchObject({ value: 3 });
  });

  it('is null when no talent changes the spell, or the talent is for another list', () => {
    expect(adjustSpell([], spell())).toBeNull();
    expect(adjustSpell([trait('spatial-skills', 2, 'another-list')], spell())).toBeNull();
  });
});

describe('attack spells with talents (decision C6, P9)', () => {
  const bolt = { kind: 'attack' as const, attackTable: 'fire-bolt', attackSize: 'medium' as const, ob: 'directed-spells' as const };
  const ball = { kind: 'attack' as const, attackTable: 'fire-ball', ob: 'list-ranks' as const, radius: 10 };

  it('Scope Skills I lets a bolt strike 2 targets', () => {
    const traits = [trait('scope-skills', 1, 'invented-list')];

    expect(boltMaxTargets(traits, spell())).toBe(2);
    expect(spellAttackProfile(bolt, null, 5, null, { maxTargets: boltMaxTargets(traits, spell()) })).toMatchObject({ maxTargets: 2 });
    expect(spellAttackProfile(bolt, null, 5, null)).not.toHaveProperty('maxTargets');
  });

  it('takes the adjusted range brackets and radius', () => {
    const traits = [trait('scope-skills', 1, 'invented-list'), trait('spatial-skills', 2, 'invented-list')];
    const range = adjustSpell(traits, spell({ range: { type: 'distance', increment: 25 } }))!.range;

    expect(spellAttackProfile(bolt, range, 5, null).ranges[0]).toEqual({ from: 0, to: 50, bonus: 0 });
    expect(spellAttackProfile(ball, null, 5, null, { radius: adjustRadius(traits, spell(), 10) }).radius).toBe(20);
  });

  it('splits the OB of a bolt in equal parts or as given', () => {
    expect(splitBoltOb(61, 2)).toEqual([31, 30]);
    expect(splitBoltOb(60, 2, [40, 20])).toEqual([40, 20]);
    expect(splitBoltOb(-25, 2)).toEqual([-25, -25]);
    expect(splitBoltOb(60, 1)).toEqual([60]);
  });
});

describe('Iron Will (decision C9)', () => {
  const rr = (traits: ActorRoundTrait[], subtype: string | null) => {
    const ironWill = ironWillModifier(traits, { subtype });
    return spellResistanceRoll({
      roll: 50,
      bonuses: { essence: 10 },
      listRealms: ['essence'],
      casterLevel: 5,
      spellModifier: 0,
      conditions: {},
      scr: 80,
      talentModifiers: ironWill ? [ironWill] : [],
    });
  };

  it('adds +5 per tier against a mental attack of Essence', () => {
    const result = rr([trait('iron-will', 2)], 'mental-attack');

    expect(result.breakdown).toContainEqual(expect.objectContaining({ key: 'iron-will', value: 10, group: 'talent' }));
    expect(result.total).toBe(50 + 10 - 10 + 10);
  });

  it('adds nothing against another spell', () => {
    expect(rr([trait('iron-will', 2)], null).breakdown.map(modifier => modifier.key)).not.toContain('iron-will');
  });
});
