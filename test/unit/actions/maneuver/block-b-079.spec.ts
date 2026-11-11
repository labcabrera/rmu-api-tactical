import { describe, expect, it } from 'vitest';
import {
  ManeuverRoll,
  ResolveManeuverCommand,
  ResolveManeuverRequest,
} from '../../../../src/modules/actions/application/cqrs/commands/resolve-maneuver.command.js';
import { GetManeuverModifiersQuery } from '../../../../src/modules/actions/application/cqrs/queries/get-maneuver-modifiers.query.js';
import { GetManeuverModifiersHandler } from '../../../../src/modules/actions/application/cqrs/handlers/get-maneuver-modifiers.handler.js';
import { ResolveManeuverHandler } from '../../../../src/modules/actions/application/cqrs/handlers/resolve-maneuver.handler.js';
import {
  adrenalOutcome,
  adrenalRounds,
  fortitudeOutcome,
  unusualAdrenalResult,
} from '../../../../src/modules/actions/domain/services/adrenal-maneuver.js';
import {
  adrenalStrengthWeightMultiplier,
  featOfStrengthDifficulty,
} from '../../../../src/modules/actions/domain/services/feat-of-strength.js';
import { complementaryRanks, skillRelation } from '../../../../src/modules/actions/domain/services/skill-aids.js';
import { ManeuverListingParams } from '../../../../src/modules/actions/interfaces/http/dto/maneuver-listing-params.js';
import { ActorRoundEffect } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { ActorRound } from '../../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { effect, load } from '../../actor-rounds/actor-round-test.factory.js';
import { breakdown, type ManeuverSetup, setupManeuver } from './maneuver-test.factory.js';

/* Workspace spec 079, block B: invented rolls, skills, weights and bonuses. */

const resolve = async (options: ManeuverSetup, req: Partial<ResolveManeuverRequest> = {}, roll = 60, unmodified?: number) => {
  const setup = setupManeuver(options);
  const handler = new ResolveManeuverHandler(
    setup.gameRepository,
    setup.actorRoundRepository,
    setup.actionRepository,
    setup.eventBus,
    setup.maneuverPort,
    setup.contextService,
    setup.psychologyTables,
  );
  const result = await handler.execute(
    new ResolveManeuverCommand(
      'action-1',
      Object.assign(new ResolveManeuverRequest('m', {}), req),
      new ManeuverRoll(roll, unmodified),
      'user-1',
      [],
    ),
  );
  return { setup, result, modifiers: breakdown(result.maneuver!.roll!.modifiers) };
};

const absolute = (result: string) => ({ result, message: 'Rolled', effects: [] });
const of = (actorRound: ActorRound, status: string) => actorRound.effects.filter(each => each.status === status);

describe('B1 similar and complementary skills', () => {
  it.each([
    [
      { skillId: 'riding', specialization: 'horse', categoryId: 'animal' },
      { skillId: 'riding', specialization: 'camel', categoryId: 'animal' },
      'same-skill',
    ],
    [{ skillId: 'tracking', categoryId: 'awareness' }, { skillId: 'perception', categoryId: 'awareness' }, 'same-category'],
    [{ skillId: 'region-lore', categoryId: 'lore' }, { skillId: 'swimming', categoryId: 'movement' }, 'other-category'],
  ])('relation of %p to %p is %s', (rolled, target, relation) => {
    expect(skillRelation(rolled, target)).toBe(relation);
  });

  it('the very skill is no similar skill', () => {
    expect(() => skillRelation({ skillId: 'riding', specialization: 'horse' }, { skillId: 'riding', specialization: 'horse' })).toThrow(
      expect.objectContaining({ code: 'err-skill-aid-invalid' }),
    );
  });

  it.each([
    [12, 0, 12],
    [12, 1, 6],
    [12, 2, 3],
    [7, 1, 3],
  ])('%i ranks of the helper #%i add %i', (ranks, index, value) => {
    expect(complementaryRanks(ranks, index)).toBe(value);
  });

  it('a similar skill adds the relation of the categories and the similarity, and gives no ranks', async () => {
    const { modifiers, result } = await resolve(
      { skillId: 'old-lore', categories: { 'old-lore': 'lore', 'river-crossing': 'movement' } },
      { similarity: { targetSkillId: 'river-crossing', similarity: -25 } },
    );
    expect(modifiers).toMatchObject({ 'similar-skill-relation': -75, 'similar-skill-similarity': -25 });
    expect(result.maneuver!.modifiers.similarity).toEqual({ targetSkillId: 'river-crossing', similarity: -25 });
  });

  it('the game master may set the relation', async () => {
    const { result } = await resolve(
      { skillId: 'old-lore', categories: { 'old-lore': 'lore', 'river-crossing': 'movement' } },
      { similarity: { targetSkillId: 'river-crossing', similarity: 0, relation: 'same-category' } },
    );
    const line = result.maneuver!.roll!.modifiers.find(each => each.key === 'similar-skill-relation')!;
    expect(line.value).toBe(-50);
    expect(line.params).toMatchObject({ relation: 'same-category', overridden: true });
    expect(result.maneuver!.roll!.modifiers.some(each => each.key === 'similar-skill-similarity')).toBe(false);
  });

  it('helpers of the same game add their ranks, the second one halved, one line each', async () => {
    const helper = ActorRound.fromProps({ ...load().getProps(), id: 'round-2', actorId: 'actor-2', actorName: 'Helper' });
    const { result } = await resolve(
      {
        skills: [
          { skillId: 'old-lore', specialization: null, totalBonus: 40, ranks: 5 },
          { skillId: 'trap-lore', specialization: null, totalBonus: 30, ranks: 8 },
        ],
        targets: [
          {
            actorRound: helper,
            character: { id: 'actor-2', skills: [{ skillId: 'old-lore', specialization: null, totalBonus: 50, ranks: 10 }] } as never,
          },
        ],
      },
      { complementary: [{ skillId: 'trap-lore' }, { actorId: 'actor-2', skillId: 'old-lore' }] },
    );
    const lines = result.maneuver!.roll!.modifiers.filter(each => each.key === 'complementary-skill');
    expect(lines.map(each => each.value)).toEqual([8, 5]);
    expect(lines[1].params).toMatchObject({ ranks: 10, position: 2, actor: 'Helper' });
  });

  it('a helper outside the game is not found', async () => {
    await expect(resolve({}, { complementary: [{ actorId: 'stranger', skillId: 'old-lore' }] })).rejects.toMatchObject({
      code: 'err-maneuver-target-not-found',
    });
  });
});

describe('B2 feats of strength', () => {
  it.each([
    [100, 1, 150, 3, 1, 60, 'h'],
    [150, 1, 75, 0, 1, 200, 'sf'],
    [75, 1, 150, 0, 1, 50, 'm'],
    [200, 0.5, 150, 0, 1, 66, 'h'],
    [600, 1, 150, 0, 4, 100, 'vh'],
    [10, 1, 200, 5, 1, -5, 'c'],
  ])('%i lbs ×%f with %i lbs and St %i (×%i): %i%% is %s', (load, factor, body, st, multiplier, adjusted, difficulty) => {
    const result = featOfStrengthDifficulty({ loadWeight: load, mechanicalFactor: factor }, body, st, multiplier);
    expect(result.adjustedPercent).toBe(adjusted);
    expect(result.difficulty).toBe(difficulty);
  });

  it('beyond 400 % the feat is nigh impossible, beyond the table', () => {
    expect(featOfStrengthDifficulty({ loadWeight: 1000 }, 100, 0)).toMatchObject({ difficulty: 'ni', beyondTable: true });
  });

  it.each([
    [2, 8],
    [1, 4],
    [0, 1],
    [-1, 0.25],
  ])('Adrenal Strength of %i steps multiplies the weight by %f', (steps, multiplier) => {
    expect(adrenalStrengthWeightMultiplier(steps)).toBe(multiplier);
  });

  it('reads the body weight and St bonus of the sheet and replaces the difficulty', async () => {
    const { result, modifiers } = await resolve(
      { skillId: 'weight-training', sheet: { info: { weight: 150 }, statistics: { st: { totalBonus: 3 } } } as never },
      { purpose: 'feat-of-strength', difficulty: 'e', featOfStrength: { loadWeight: 100 } },
    );
    expect(modifiers.difficulty).toBe(-10);
    expect(result.maneuver!.modifiers.difficulty).toBe('h');
    expect(result.maneuver!.result!.featOfStrength).toMatchObject({ percent: 66, adjustedPercent: 60, difficulty: 'h' });
  });

  it('Adrenal Strength multiplies the body weight', async () => {
    const { result } = await resolve(
      {
        skillId: 'weight-training',
        sheet: { info: { weight: 100 } } as never,
        actorRound: actorRound => actorRound.applyAttackResults(undefined, [effect('adrenal-strength', 1, 2)], undefined),
      },
      { purpose: 'feat-of-strength', featOfStrength: { loadWeight: 400 } },
    );
    expect(result.maneuver!.result!.featOfStrength).toMatchObject({ weightMultiplier: 4, percent: 100, difficulty: 'vh' });
  });

  it.each([
    [{ skillId: 'old-lore' }, { loadWeight: 10 }, 'skill'],
    [{ skillId: 'weight-training' }, { loadWeight: 10 }, 'body-weight'],
    [{ skillId: 'weight-training', sheet: { info: { weight: 100 } } }, { loadWeight: 0 }, 'load'],
  ])('rejects %p with %p (%s)', async (options, featOfStrength, reason) => {
    await expect(resolve(options as ManeuverSetup, { purpose: 'feat-of-strength', featOfStrength })).rejects.toMatchObject({
      code: 'err-feat-of-strength-invalid',
      details: { reason },
    });
  });

  it('an NPC without a sheet weight sends its body weight', async () => {
    const { result } = await resolve(
      { skillId: 'weight-training' },
      { purpose: 'feat-of-strength', featOfStrength: { loadWeight: 50, bodyWeight: 200, strengthBonus: 0 } },
    );
    expect(result.maneuver!.result!.featOfStrength).toMatchObject({ bodyWeight: 200, percent: 25, difficulty: 'e' });
  });
});

describe('B3 adrenal moves', () => {
  it.each([
    [90, 1],
    [101, 1],
    [120, 1],
    [121, 2],
    [176, 4],
  ])('a total of %i gives %i rounds', (total, rounds) => {
    expect(adrenalRounds(total)).toBe(rounds);
  });

  it.each([
    ['success', 'absolute-success'],
    ['partial-success', 'absolute-success'],
    ['failure', 'absolute-failure'],
  ])('the cleansing trance turns %s into %s', (result, expected) => {
    expect(unusualAdrenalResult(result)).toBe(expected);
  });

  it('success: the full benefit from the next round, 1 round per full 20 over 101', () => {
    const outcome = adrenalOutcome('focus', 'adrenal-focus', 'success', 125, 3);
    expect(outcome.effects.map(each => [each.status, each.value, each.rounds, each.fromRound])).toEqual([['adrenal-focus', 25, 2, 4]]);
  });

  it('Defense lasts twice as long', () => {
    const outcome = adrenalOutcome('defense', 'adrenal-defense', 'success', 125, 3);
    expect(outcome.effects.map(each => [each.value, each.rounds])).toEqual([[2, 4]]);
  });

  it('absolute success doubles the first round', () => {
    const outcome = adrenalOutcome('speed', 'adrenal-speed', 'absolute-success', 180, 1);
    expect(outcome.effects.map(each => [each.status, each.value, each.rounds, each.fromRound])).toEqual([
      ['adrenal-speed', 4, 1, 2],
      ['adrenal-speed', 2, 3, 3],
    ]);
    expect(outcome.blockLifted).toBe(true);
  });

  it('partial success gives half for 1 round, and nothing for Strength', () => {
    expect(adrenalOutcome('focus', 'adrenal-focus', 'partial-success', 90, 1).effects.map(each => [each.value, each.rounds])).toEqual([
      [12, 1],
    ]);
    expect(adrenalOutcome('strength', 'adrenal-strength', 'partial-success', 90, 1).effects).toEqual([]);
  });

  it.each([
    ['defense', 'adrenal-defense', -1],
    ['speed', 'hold', 2],
    ['strength', 'adrenal-strength', -1],
  ] as const)('absolute failure of %s blocks the skill and gives %s %i next round', (kind, status, value) => {
    const outcome = adrenalOutcome(kind, `adrenal-${kind}`, 'absolute-failure', -5, 1);
    expect(outcome.block).toBe(true);
    expect(outcome.effects.find(each => each.status === 'adrenal-block')).toMatchObject({
      value: -25,
      data: { skillId: `adrenal-${kind}` },
    });
    expect(outcome.effects.find(each => each.status === status)).toMatchObject({ value, rounds: 1, fromRound: 2 });
  });

  it('resolves on Table 3-4, warns about the concentration round and creates the effect', async () => {
    const { result, setup } = await resolve({ skillId: 'adrenal-focus', absolute: absolute('success') }, { purpose: 'adrenal' }, 130);
    expect(setup.absolute).toHaveBeenCalledWith(expect.any(Number), 'adrenal', false);
    expect(result.maneuver!.roll!.skipped).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: 'adrenal-concentration', reason: 'adrenal-concentration-missing' })]),
    );
    expect(result.maneuver!.result!.adrenal).toMatchObject({ kind: 'focus', rounds: 4, fromRound: 2 });
    expect(of(setup.actorRound, 'adrenal-focus')).toHaveLength(1);
    expect(setup.actorRoundUpdate).toHaveBeenCalled();
  });

  it('an unusual event of a success is an absolute success', async () => {
    const { result } = await resolve({ skillId: 'adrenal-speed', absolute: absolute('success') }, { purpose: 'adrenal' }, 120, 66);
    expect(result.maneuver!.result!.result).toBe('absolute-success');
    expect(result.maneuver!.result!.adrenal).toMatchObject({ doubled: true });
  });

  it('an absolute failure blocks the skill: -25 to its next maneuvers, until an absolute success', async () => {
    const failed = await resolve({ skillId: 'adrenal-focus', absolute: absolute('absolute-failure') }, { purpose: 'adrenal' }, -10);
    expect(of(failed.setup.actorRound, 'adrenal-block')).toHaveLength(1);
    const blocked = await resolve(
      {
        skillId: 'adrenal-focus',
        absolute: absolute('absolute-success'),
        actorRound: actorRound => actorRound.applyAttackResults(undefined, failed.setup.actorRound.effects, undefined),
      },
      { purpose: 'adrenal' },
      190,
    );
    expect(blocked.modifiers['adrenal-block']).toBe(-25);
    expect(of(blocked.setup.actorRound, 'adrenal-block')).toHaveLength(0);
  });

  it('rejects a skill that is no adrenal move', async () => {
    await expect(resolve({ skillId: 'old-lore' }, { purpose: 'adrenal' })).rejects.toMatchObject({
      code: 'err-adrenal-invalid',
      details: { reason: 'skill' },
    });
  });

  it('Adrenal Focus adds its bonus to the Brawn, Gymnastic and Movement maneuvers only', async () => {
    const focus = (actorRound: ActorRound) => actorRound.applyAttackResults(undefined, [effect('adrenal-focus', 25, 2)], undefined);
    const brawn = await resolve({ skillId: 'old-lore', categories: { 'old-lore': 'brawn' }, actorRound: focus });
    expect(brawn.modifiers['adrenal-focus']).toBe(25);
    const lore = await resolve({ skillId: 'old-lore', categories: { 'old-lore': 'lore' }, actorRound: focus });
    expect(lore.modifiers['adrenal-focus']).toBeUndefined();
  });

  it('a pending effect of the next round does not count yet', () => {
    const actorRound = load({ round: 1 });
    const pending = effect('adrenal-focus', 25, 1);
    pending.fromRound = 2;
    actorRound.applyAttackResults(undefined, [pending], undefined);
    expect(actorRound.adrenalFocusBonus()).toBe(0);
  });

  describe('Adrenal Defense', () => {
    const withDefense = (value: number) => {
      const actorRound = load({ round: 1 });
      actorRound.applyAttackResults(undefined, [effect('adrenal-defense', value, 2)], undefined);
      return actorRound;
    };

    it('a partial dodge is no concentration', () => {
      const actorRound = withDefense(1);
      actorRound.setDefenseMode('partial', undefined);
      expect(actorRound.concentration()).toEqual([]);
    });

    it('a full dodge without the 4 AP action is a concentration, instantaneous when doubled', () => {
      const actorRound = withDefense(2);
      actorRound.setDefenseMode('full', undefined);
      expect(actorRound.defenseMode).toMatchObject({ dodge: 'full', adrenal: true });
      expect(actorRound.concentration()).toEqual([{ kind: 'full-dodge' }]);
      const doubled = withDefense(4);
      doubled.setDefenseMode('full', undefined);
      expect(doubled.concentration()).toEqual([]);
    });

    it('a partial success does not allow the full dodge', () => {
      expect(() => withDefense(1).setDefenseMode('full', undefined)).toThrow('4 AP dodge action');
    });

    it('after an absolute failure the actor cannot dodge', () => {
      expect(() => withDefense(-1).setDefenseMode('partial', undefined)).toThrow(expect.objectContaining({ code: 'err-adrenal-no-dodge' }));
    });

    it('breaking the concentration drops the full dodge of Adrenal Defense', () => {
      const actorRound = withDefense(2);
      actorRound.setDefenseMode('full', undefined);
      actorRound.breakConcentration();
      expect(actorRound.defenseMode.dodge).toBe('none');
    });
  });

  it('Adrenal Speed gives its AP the round it counts', () => {
    const actorRound = load({ round: 1 });
    actorRound.applyAttackResults(undefined, [effect('adrenal-speed', 2, 1)], undefined);
    expect(actorRound.totalCapacity()).toBe(6);
  });
});

describe('B4 Fortitude', () => {
  it('success halves the fatigue, hit loss, injury and stun penalties, rounded for the actor', () => {
    const actorRound = load({ hp: [100, 40], round: 1 });
    actorRound.applyAttackResults(undefined, [effect('stunned', -25, 2)], undefined);
    expect(actorRound.getPenaltySum()).toBe(-45);
    actorRound.applyAttackResults(undefined, [effect('fortitude', 50, 1)], undefined);
    expect(actorRound.getPenaltiesBySource()).toEqual(expect.arrayContaining([{ source: 'fortitude', value: 23 }]));
    expect(actorRound.getPenaltySum()).toBe(-22);
    expect(actorRound.hasEffect('stunned')).toBe(true);
    expect(actorRound.getPenaltiesWithoutFortitude().some(each => each.source === 'fortitude')).toBe(false);
  });

  it('the doubled round removes them', () => {
    const actorRound = load({ hp: [100, 40] });
    actorRound.applyAttackResults(undefined, [effect('fortitude', 100, 1)], undefined);
    expect(actorRound.getPenaltySum()).toBe(0);
  });

  it('absolute success: no penalties now, half the next rounds', () => {
    const outcome = fortitudeOutcome('fortitude', 'absolute-success', 180, 1);
    expect(outcome.effects.map(each => [each.value, each.rounds, each.fromRound])).toEqual([
      [100, 1, undefined],
      [50, 3, 2],
    ]);
  });

  it('absolute failure adds 20 of fatigue and blocks the skill', () => {
    const outcome = fortitudeOutcome('fortitude', 'absolute-failure', -10, 1);
    expect(outcome).toMatchObject({ fatigue: 20, block: true });
  });

  it('instantaneous, 0 AP, Table 3-4, with every penalty and the effect from this round', async () => {
    const { result, setup, modifiers } = await resolve(
      {
        skillId: 'fortitude',
        freeAction: true,
        absolute: absolute('success'),
        actorRound: actorRound => {
          actorRound.applyAttackResults(undefined, [effect('stunned', -25, 2), effect('fortitude', 50, 1)], undefined);
        },
      },
      { purpose: 'fortitude' },
      110,
    );
    expect(modifiers['penalty-stunned']).toBe(-25);
    expect(modifiers['penalty-fortitude']).toBeUndefined();
    expect(result.apRange).toEqual({ min: 0, max: 0 });
    expect(setup.absolute).toHaveBeenCalledWith(expect.any(Number), 'adrenal', false);
    expect(result.maneuver!.result!.adrenal).toMatchObject({ kind: 'fortitude', rounds: 2 });
    expect(of(setup.actorRound, 'fortitude').some(each => each.fromRound === undefined)).toBe(true);
  });

  it('the absolute failure adds fatigue to the actor', async () => {
    const { setup } = await resolve(
      { skillId: 'fortitude', freeAction: true, absolute: absolute('absolute-failure') },
      { purpose: 'fortitude' },
      -20,
    );
    expect(setup.actorRound.getPenaltiesBySource()).toEqual(expect.arrayContaining([{ source: 'fatigue', value: -20 }]));
  });

  it('is instantaneous', async () => {
    await expect(resolve({ skillId: 'fortitude' }, { purpose: 'fortitude' })).rejects.toMatchObject({
      code: 'err-adrenal-invalid',
      details: { reason: 'not-instantaneous' },
    });
  });
});

describe('maneuver listing of block B', () => {
  it('parses the query of the aids and the feat', () => {
    expect(
      ManeuverListingParams.parse({
        purpose: 'feat-of-strength',
        similarTo: 'perception',
        similarity: '-25',
        complementary: [':traps:', 'actor-2:perception'],
        loadWeight: '120',
        mechanicalFactor: '0.5',
      }),
    ).toEqual({
      purpose: 'feat-of-strength',
      similarity: { targetSkillId: 'perception', similarity: -25 },
      complementary: [{ skillId: 'traps' }, { actorId: 'actor-2', skillId: 'perception' }],
      featOfStrength: { loadWeight: 120, mechanicalFactor: 0.5, bodyWeight: undefined, strengthBonus: undefined },
    });
  });

  it.each([[{ purpose: 'made-up' }], [{ similarTo: 'perception', similarity: '-30' }], [{ complementary: 'nobody' }]])(
    'rejects %p',
    raw => {
      expect(() => ManeuverListingParams.parse(raw)).toThrow(expect.objectContaining({ code: 'err-invalid-modifier' }));
    },
  );

  it('gives the aid lines and the feat of strength of the sheet', async () => {
    const setup = setupManeuver({ skillId: 'weight-training', sheet: { info: { weight: 150 } } as never });
    const handler = new GetManeuverModifiersHandler(setup.actionRepository, setup.gameRepository, setup.contextService);
    const listing = await handler.execute(
      new GetManeuverModifiersQuery('action-1', undefined, undefined, 'user-1', [], {
        purpose: 'feat-of-strength',
        featOfStrength: { loadWeight: 75 },
        complementary: [{ skillId: 'weight-training' }],
      }),
    );
    expect(listing.featOfStrength).toMatchObject({ bodyWeight: 150, strengthBonus: null, result: { difficulty: 'm' } });
    expect(listing.aids?.map(each => each.key)).toEqual(['complementary-skill']);
  });

  it('says why the load cannot be read', async () => {
    const setup = setupManeuver({ skillId: 'weight-training' });
    const handler = new GetManeuverModifiersHandler(setup.actionRepository, setup.gameRepository, setup.contextService);
    const listing = await handler.execute(
      new GetManeuverModifiersQuery('action-1', undefined, undefined, 'user-1', [], {
        purpose: 'feat-of-strength',
        featOfStrength: { loadWeight: 75 },
      }),
    );
    expect(listing.featOfStrength).toMatchObject({ bodyWeight: null, invalid: 'body-weight' });
  });
});

describe('effect bookkeeping', () => {
  it('a timed effect of the next round keeps its rounds through the upkeep of this one', () => {
    const actorRound = load({ round: 1 });
    const next = new ActorRoundEffect('e1', 'adrenal-focus', 25, 2, undefined, undefined, undefined, undefined, undefined, 2);
    actorRound.applyAttackResults(undefined, [next], undefined);
    actorRound.applyUpkeep();
    expect(actorRound.effects.find(each => each.id === 'e1')?.rounds).toBe(2);
  });
});
