import { describe, expect, it } from 'vitest';
import type { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundTrait } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { buildInjury } from '../../../src/modules/actor-rounds/domain/value-objects/injury.vo.js';
import { fearStateOf } from '../../../src/modules/psychology/application/cqrs/handlers/fear-effect.handlers.js';
import { type AppliedAttack, FearUpkeep } from '../../../src/modules/psychology/domain/services/fear-upkeep.js';
import { sideStrength, strengthLevel } from '../../../src/modules/psychology/domain/services/side-strength.js';
import { ActorRoundAlert } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-alert.vo.js';
import type { GameSide } from '../../../src/modules/games/domain/value-objects/game-side.vo.js';
import { PSYCHOLOGY_TABLES } from '../../fixtures/psychology-tables.js';
import { effect, load } from '../actor-rounds/actor-round-test.factory.js';

type Options = Parameters<typeof load>[0] & { actorId: string };

const actor = ({ actorId, ...options }: Options): ActorRound => Object.assign(load({ factionId: 'fellowship', ...options }), { actorId });

const bleeding = (id: string, value: number) =>
  buildInjury({ id, type: 'cut-burn', penalty: -5, bleeding: value, source: { kind: 'critical' } });

// Made-up thresholds of the fixture: at least 40% → 3, above 40% → 6, above 70% → 9
const THRESHOLDS = PSYCHOLOGY_TABLES.fallenThresholds;

const single = (factionId: string): GameSide => ({ id: factionId, name: null, factionIds: [factionId], leaderActorId: null });

describe('suggested fear checks by heads, book rules (workspace spec 068, decision 16; spec 100)', () => {
  const faction = (fallen: number, total: number) =>
    Array.from({ length: total }, (_, i) =>
      actor({ actorId: `a${i}`, effects: i < fallen ? [effect(i % 2 === 0 ? 'dead' : 'fear-routed', 10)] : [] }),
    );
  const book = (rounds: ActorRound[], alerted: Record<string, string[]> = {}, thresholds = THRESHOLDS) =>
    FearUpkeep.suggestedChecks(rounds, [single('fellowship')], 'book', thresholds, alerted);

  it('suggests the highest threshold crossed, with its fright level and the share, to the first able actor', () => {
    const rounds = faction(2, 5);
    const [check] = book(rounds);
    expect(check).toMatchObject({
      sideId: 'fellowship',
      factionId: 'fellowship',
      factionIds: ['fellowship'],
      frightLevel: 3,
      fallenShare: 0.4,
      rules: 'book',
      keys: ['0.4'],
      triggers: ['0.4'],
      alertKey: 'side:fellowship',
    });
    expect(check.actorRound.actorId).toBe('a2');
    // A jump past several thresholds suggests the highest and marks every one
    expect(book(faction(4, 5))[0]).toMatchObject({ frightLevel: 9, keys: ['0.4', '0.4+', '0.7+'] });
  });

  it('does not suggest a threshold already alerted, by side or by faction (games in progress), nor below the first one', () => {
    expect(book(faction(2, 5), { 'side:fellowship': ['0.4'] })).toEqual([]);
    // Legacy key by faction
    expect(book(faction(2, 5), { fellowship: ['0.4'] })).toEqual([]);
    expect(book(faction(3, 5), { fellowship: ['0.4'] })[0]).toMatchObject({ frightLevel: 6, keys: ['0.4+'] });
    expect(book(faction(1, 5))).toEqual([]);
    // Without thresholds (an older core) nothing is suggested
    expect(book(faction(4, 5), {}, null)).toEqual([]);
  });

  it('counts heads by side, across its factions, with the unified fallen (dying and paralyzed fall too)', () => {
    const rounds = [
      actor({ actorId: 'a', factionId: 'f1', effects: [effect('dying')] }),
      actor({ actorId: 'b', factionId: 'f2', effects: [effect('paralyzed')] }),
      actor({ actorId: 'c', factionId: 'f2' }),
      actor({ actorId: 'd', factionId: 'f2' }),
      actor({ actorId: 'e', factionId: 'f3' }),
    ];
    const sides: GameSide[] = [{ id: 'allies', name: 'Allies', factionIds: ['f1', 'f2'], leaderActorId: null }, single('f3')];
    const checks = FearUpkeep.suggestedChecks(rounds, sides, 'book', THRESHOLDS, { f1: ['0.4'] });
    // 2 of 4 fallen; 0.4 was alerted to f1 before the sides existed
    expect(checks).toHaveLength(1);
    expect(checks[0]).toMatchObject({ sideId: 'allies', factionId: 'f2', factionIds: ['f1', 'f2'], fallenShare: 0.5, keys: ['0.4+'] });
    expect(checks[0].actorRound.actorId).toBe('c');
  });
});

describe('the unified fallen (workspace spec 100, decision 10)', () => {
  it.each([
    ['dead', true],
    ['dying', true],
    ['unconscious', true],
    ['incapacitated', true],
    ['paralyzed', true],
    ['fear-routed', true],
    ['fear-broken', true],
    ['fear-retreat', false],
    ['stunned', false],
  ])('%s is fallen: %s', (status, fallen) => {
    expect(FearUpkeep.isFallen(load({ effects: [effect(status, 10)] }))).toBe(fallen);
  });
});

/** The company of Maela (workspace spec 100): Maela 8 (leader), Iven 4 and three soldiers of level 2, total 18. */
const company = (effects: Record<string, string> = {}) =>
  [
    ['maela', 8],
    ['iven', 4],
    ['soldier-1', 2],
    ['soldier-2', 2],
    ['soldier-3', 2],
  ].map(([actorId, level]) =>
    actor({
      actorId: actorId as string,
      level: level as number,
      factionId: 'company',
      effects: effects[actorId] ? [effect(effects[actorId], 10)] : [],
    }),
  );
const companySide: GameSide = { id: 'company', name: 'Company', factionIds: ['company'], leaderActorId: 'maela' };

describe('strength of a side (workspace spec 100, decisions 11-13)', () => {
  it('sums levels and heads standing, incapacitated and fled', () => {
    const [strength] = sideStrength(company({ maela: 'dead', 'soldier-1': 'unconscious' }), [companySide]);
    expect(strength).toMatchObject({
      sideId: 'company',
      totalLevels: 18,
      standingLevels: 8,
      incapacitatedLevels: 10,
      fledLevels: 0,
      totalCount: 5,
      standingCount: 3,
      incapacitatedCount: 2,
      fledCount: 0,
    });
    const [fled] = sideStrength(company({ maela: 'dead', 'soldier-1': 'unconscious', 'soldier-2': 'fear-routed' }), [companySide]);
    expect(fled).toMatchObject({ standingLevels: 6, incapacitatedLevels: 10, fledLevels: 2, standingCount: 2, fledCount: 1 });
  });

  it('a missing or 0 level counts 1, and negative hits count 0 of the combined hits', () => {
    const rounds = [
      actor({ actorId: 'a', level: 0, hp: [30, -12] }),
      actor({ actorId: 'b', hp: [20, 15] }),
      actor({ actorId: 'stranger', factionId: '' }),
    ];
    const [strength] = sideStrength(rounds, [single('fellowship')]);
    expect(strength).toMatchObject({ totalLevels: 2, totalCount: 2, hpCurrent: 15, hpMax: 50 });
    expect(strengthLevel({})).toBe(1);
  });
});

describe('group triggers of the house rules (workspace spec 100, decision 19)', () => {
  const house = (rounds: ActorRound[], sides: GameSide[], alerted: Record<string, string[]> = {}) =>
    FearUpkeep.suggestedChecks(rounds, sides, 'house', null, alerted);
  const enemies = (levels: number[]) => levels.map((level, i) => actor({ actorId: `orc-${i}`, level, factionId: 'orcs' }));

  it('the company with Maela and a soldier down alerts level 10: strength below 50% and the leader down', () => {
    const [check] = house(company({ maela: 'dead', 'soldier-1': 'unconscious' }), [companySide]);
    expect(check).toMatchObject({
      sideId: 'company',
      frightLevel: 10,
      fallenShare: 0.56,
      rules: 'house',
      triggers: ['strength-50', 'strength-below-50', 'leader-down'],
      alertKey: 'side:company',
    });
    expect(check.actorRound.actorId).toBe('iven');
    // Book counts heads: 2 of 5 is 40%
    expect(
      FearUpkeep.suggestedChecks(company({ maela: 'dead', 'soldier-1': 'unconscious' }), [companySide], 'book', THRESHOLDS, {})[0],
    ).toMatchObject({ fallenShare: 0.4, frightLevel: 3 });
  });

  /** A side of one faction with these levels, the first `down` of them dead. */
  const band = (levels: number[], down: number) =>
    levels.map((level, i) => actor({ actorId: `m${i}`, level, factionId: 'band', effects: i < down ? [effect('dead')] : [] }));
  const bandSide = [single('band')];

  it.each([
    ['exactly half standing', [4, 4], 1, ['strength-50'], 5],
    ['below half', [8, 4, 2, 2, 2], 2, ['strength-50', 'strength-below-50'], 10],
    ['below a quarter', [8, 4, 2, 2, 2], 3, ['strength-50', 'strength-below-50', 'strength-25'], 15],
    ['below a tenth', [10, 1], 1, ['strength-50', 'strength-below-50', 'strength-25', 'strength-10'], 20],
    ['more than half standing', [8, 4, 2, 2, 2], 1, [], 0],
  ])('strength: %s', (_, levels, down, triggers, level) => {
    const [check] = house(band(levels, down), bandSide);
    if (triggers.length === 0) {
      expect(check).toBeUndefined();
    } else {
      expect(check).toMatchObject({ triggers, frightLevel: level });
    }
  });

  it('outnumbered: the standing strength of the other sides twice or three times its own', () => {
    const sides = [{ ...companySide, leaderActorId: null }, single('orcs')];
    // 18 against 36: twice
    const twice = house([...company(), ...enemies([12, 12, 12])], sides);
    expect(twice).toEqual([expect.objectContaining({ sideId: 'company', triggers: ['outnumbered-2'], frightLevel: 5 })]);
    // 18 against 54: three times
    const thrice = house([...company(), ...enemies([18, 18, 18])], sides);
    expect(thrice[0]).toMatchObject({ triggers: ['outnumbered-2', 'outnumbered-3'], frightLevel: 10 });
    // Already alerted twice: only the higher one, by side
    expect(house([...company(), ...enemies([18, 18, 18])], sides, { 'side:company': ['outnumbered-2'] })[0]).toMatchObject({
      triggers: ['outnumbered-3'],
    });
    // Fallen enemies do not count
    const fallenOrcs = enemies([18, 18, 18]).map((orc, i) => (i > 0 ? Object.assign(orc, { effects: [effect('dead')] }) : orc));
    expect(house([...company(), ...fallenOrcs], sides).filter(check => check.sideId === 'company')).toEqual([]);
  });

  it('a side all down gets no alert, as nobody can take it', () => {
    const all = company({ maela: 'dead', iven: 'dead', 'soldier-1': 'dead', 'soldier-2': 'dead', 'soldier-3': 'dead' });
    expect(house(all, [companySide])).toEqual([]);
  });

  it('honours the legacy keys of the factions of the side', () => {
    expect(
      house(company({ maela: 'dead', 'soldier-1': 'unconscious' }), [companySide], { company: ['strength-50', 'leader-down'] })[0],
    ).toMatchObject({ triggers: ['strength-below-50'], frightLevel: 10 });
  });
});

describe('individual triggers of the house rules (workspace spec 100, decision 20)', () => {
  const sides = [companySide, single('orcs')];
  const orcs = () => [1, 2, 3].map(i => actor({ actorId: `orc-${i}`, factionId: 'orcs' }));

  it('surrounded: three distinct attackers in the round, or attacks from the flank and the rear', () => {
    const rounds = [...company(), ...orcs()];
    const three: AppliedAttack[] = ['orc-1', 'orc-2', 'orc-3', 'orc-3'].map(attackerId => ({ attackerId, targetId: 'iven' }));
    const checks = FearUpkeep.individualChecks(rounds, sides, three, {});
    expect(checks).toEqual([
      expect.objectContaining({
        trigger: 'surrounded',
        sideId: 'company',
        frightLevel: 10,
        alertKey: 'actor:iven',
        attackerIds: ['orc-1', 'orc-2', 'orc-3'],
      }),
    ]);
    expect(checks[0].actorRound.actorId).toBe('iven');
    const positions: AppliedAttack[] = [
      { attackerId: 'orc-1', targetId: 'maela', position: 'flank' },
      { attackerId: 'orc-2', targetId: 'maela', position: 'rear' },
    ];
    expect(FearUpkeep.individualChecks(rounds, sides, positions, {}).map(check => check.actorRound.actorId)).toEqual(['maela']);
    // Two attackers from the front, or a flank alone, are not enough; and once per actor and game
    expect(FearUpkeep.individualChecks(rounds, sides, positions.slice(0, 1), {})).toEqual([]);
    expect(FearUpkeep.individualChecks(rounds, sides, positions, { 'actor:maela': ['surrounded'] })).toEqual([]);
  });

  it('a fallen actor is not alerted', () => {
    const rounds = [...company({ iven: 'dead' }), ...orcs()];
    const three: AppliedAttack[] = ['orc-1', 'orc-2', 'orc-3'].map(attackerId => ({ attackerId, targetId: 'iven' }));
    expect(FearUpkeep.individualChecks(rounds, sides, three, {})).toEqual([]);
  });

  it('alone: the only member of its side standing, in a side of two or more', () => {
    const rounds = [...company({ maela: 'dead', 'soldier-1': 'dead', 'soldier-2': 'fear-broken', 'soldier-3': 'unconscious' }), ...orcs()];
    const checks = FearUpkeep.individualChecks(rounds, sides, [], {});
    expect(checks.map(check => [check.actorRound.actorId, check.trigger])).toEqual([['iven', 'alone']]);
    expect(FearUpkeep.individualChecks(rounds, sides, [], { 'actor:iven': ['alone'] })).toEqual([]);
    // A side of one is never alone
    expect(FearUpkeep.individualChecks([actor({ actorId: 'hermit', factionId: 'h' })], [single('h')], [], {})).toEqual([]);
  });
});

describe('end of the fear (workspace spec 100, decision 22)', () => {
  const sides = [companySide, single('orcs')];
  const orcs = (dead: number) =>
    [1, 2, 3].map(i => actor({ actorId: `orc-${i}`, level: 3, factionId: 'orcs', effects: i <= dead ? [effect('dead')] : [] }));

  it('the first upkeep only records the fallen levels', () => {
    const result = FearUpkeep.easeChecks([...company(), ...orcs(1)], sides, {});
    expect(result).toEqual({ fallen: { company: 0, orcs: 3 }, suggestions: [] });
  });

  it('a side that caused more losses than it took, with members balking or retreating, gets the suggestion', () => {
    const rounds = [...company({ iven: 'fear-balk', 'soldier-1': 'fear-retreat', 'soldier-2': 'dead' }), ...orcs(2)];
    const { fallen, suggestions } = FearUpkeep.easeChecks(rounds, sides, { company: 0, orcs: 0 });
    expect(fallen).toEqual({ company: 2, orcs: 6 });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ sideId: 'company', factionIds: ['company'], actorIds: ['iven', 'soldier-1'] });
    expect(suggestions[0].actorRound.actorId).toBe('maela');
    // Even losses, or nobody afraid: nothing
    expect(FearUpkeep.easeChecks(rounds, sides, { company: 0, orcs: 4 }).suggestions).toEqual([]);
    expect(FearUpkeep.easeChecks([...company(), ...orcs(2)], sides, { company: 0, orcs: 0 }).suggestions).toEqual([]);
  });

  it('does not suggest it again while one of the side is pending', () => {
    const rounds = [...company({ iven: 'fear-balk' }), ...orcs(2)];
    rounds[0].alerts.push(ActorRoundAlert.buildFearEaseSuggested('company', ['company'], ['iven']));
    expect(FearUpkeep.easeChecks(rounds, sides, { company: 0, orcs: 0 }).suggestions).toEqual([]);
  });
});

describe('Revulsion (workspace spec 068, decision 18)', () => {
  it('the level is the bleeding of the others plus the corpse level for each bloody corpse', () => {
    const squeamish = actor({ actorId: 'pippin', injuries: [bleeding('own', 2)] });
    squeamish.traits = [new ActorRoundTrait('revulsion', 1, null)];
    const wounded = actor({ actorId: 'boromir', injuries: [bleeding('cut', 3)] });
    const corpse = actor({ actorId: 'orc', effects: [effect('dead')], injuries: [bleeding('gash', 4)] });
    const clean = actor({ actorId: 'sam' });
    // Made-up corpse level 7: 3 + 7
    expect(
      FearUpkeep.revulsionChecks([squeamish, wounded, corpse, clean], PSYCHOLOGY_TABLES).map(c => [c.actorRound.actorId, c.level]),
    ).toEqual([['pippin', 10]]);
    expect(FearUpkeep.revulsionChecks([squeamish, clean], PSYCHOLOGY_TABLES)).toEqual([]);
  });
});

describe('fear effects of an individual RR (workspace spec 068, decision 15)', () => {
  it('maps the failure severity to its fear state, from the tables or in order', () => {
    expect(fearStateOf('severe', PSYCHOLOGY_TABLES)).toBe('routed');
    expect(fearStateOf('extreme', null)).toBe('broken');
    const round = load({ effects: [effect('fear-routed', 30)] });
    expect(round.frighten(`fear-${fearStateOf('mild', null)}`, 0).status).toBe('fear-routed');
  });
});
