import { describe, expect, it } from 'vitest';
import type { PoisonRrResult } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { PoisonStages } from '../../../src/modules/actor-rounds/domain/services/poison-stages.js';
import type { AntidoteData, PoisonData, PoisonSeverityRow } from '../../../src/modules/actor-rounds/domain/value-objects/poison.vo.js';
import { load } from './actor-round-test.factory.js';

// Made-up rows (the real ones come from core's imported tables).
const row = (severity: PoisonSeverityRow['severity'], overrides: Partial<PoisonSeverityRow> = {}): PoisonSeverityRow => ({
  category: 'muscle',
  severity,
  start: { min: 2, max: 2, unit: 'round' },
  duration: { min: 1, max: 1, unit: 'minute' },
  penalty: { min: -10, max: -10 },
  hitsPerRound: null,
  hitsRounds: null,
  condition: null,
  conditionDelay: null,
  conditionDuration: null,
  permanent: false,
  ...overrides,
});

const ROWS: PoisonSeverityRow[] = [
  row('mild'),
  row('moderate', { start: { min: 1, max: 1, unit: 'round' }, penalty: { min: -20, max: -20 }, hitsPerRound: { min: 3, max: 3 } }),
  row('severe', {
    start: { min: 4, max: 4, unit: 'round' },
    duration: null,
    penalty: null,
    condition: 'paralyzed',
    conditionDelay: { min: 1, max: 1, unit: 'round' },
    conditionDuration: { min: 2, max: 2, unit: 'round' },
  }),
  row('extreme', { start: { min: 5, max: 5, unit: 'round' }, duration: null, penalty: null, condition: 'dead' }),
];

const POISON: PoisonData = { name: 'Test venom', category: 'muscle', level: 5 };

const failed = (severity: PoisonRrResult['severity'], failure = 30): PoisonRrResult => ({
  roll: 10,
  bonus: 10,
  total: 50 - failure,
  failure,
  resisted: false,
  severity,
});

const random = () => 0;

describe('PoisonStages (workspace spec 042, decision 5)', () => {
  it('builds one stage per severity up to the one reached, never starting before the previous one', () => {
    const stages = PoisonStages.build(POISON, 'severe', ROWS, random);
    expect(stages.map(stage => stage.severity)).toEqual(['mild', 'moderate', 'severe']);
    // Moderate rolls 1 round but cannot start before mild (2).
    expect(stages.map(stage => stage.startsAt)).toEqual([2, 2, 4]);
    expect(stages[0].endsAt).toBe(2 + 6);
    expect(stages[1].penalty).toBe(-20);
    expect(stages[2]).toMatchObject({ endsAt: null, condition: 'paralyzed', conditionAt: 5, conditionUntil: 7 });
  });

  it('caps the severity with the maximum of the poison', () => {
    expect(PoisonStages.severityOf('extreme', { ...POISON, maxSeverity: 'moderate' })).toBe('moderate');
    expect(PoisonStages.severityOf('mild', { ...POISON, maxSeverity: 'severe' })).toBe('mild');
  });

  it('takes the onset of the poison for the mild stage', () => {
    const stages = PoisonStages.build({ ...POISON, onsetRounds: { min: 0, max: 0 } }, 'mild', ROWS, random);
    expect(stages[0].startsAt).toBe(0);
  });

  it('has no stages for a category without rows', () => {
    expect(PoisonStages.build({ ...POISON, category: 'nerve' }, 'extreme', ROWS, random)).toEqual([]);
  });

  it.each<[AntidoteData, boolean]>([
    [{ source: 'item', name: 'a', categories: ['muscle'], level: 5 }, true],
    [{ source: 'item', name: 'a', categories: ['any'], level: 6 }, true],
    [{ source: 'item', name: 'a', categories: ['nerve'], level: 9 }, false],
    [{ source: 'item', name: 'a', categories: ['muscle'], level: 4 }, false],
    [{ source: 'magic', name: 'a', level: 5 }, true],
    [{ source: 'external', name: 'a' }, false],
  ])('antidote %j neutralizes: %s', (antidote, expected) => {
    const poison = PoisonStages.poisoning(POISON, failed('mild'), 'mild', ROWS, new Date().toISOString(), random);
    expect(PoisonStages.neutralizes(antidote, poison)).toBe(expected);
  });

  it('an antidote given too late does nothing', () => {
    const poison = PoisonStages.poisoning(POISON, failed('mild'), 'mild', ROWS, new Date().toISOString(), random);
    poison.elapsedRounds = 361;
    expect(PoisonStages.neutralizes({ source: 'item', name: 'a', categories: ['muscle'], level: 5, withinHours: 1 }, poison)).toBe(false);
  });
});

describe('Poisoning an actor round (workspace spec 042)', () => {
  const poisoned = (severity: PoisonRrResult['severity'], poison: PoisonData = POISON) => {
    const actorRound = load({ hp: [50, 50, 30] });
    const exposure = actorRound.exposeToPoison(poison);
    const injury = actorRound.resolvePoisonExposure(exposure.id, failed(severity), ROWS, random);
    return { actorRound, injury: injury! };
  };

  it('keeps an exposure until its RR, and a resisted RR leaves nothing', () => {
    const actorRound = load();
    const exposure = actorRound.exposeToPoison(POISON);
    expect(actorRound.poisonExposures).toHaveLength(1);
    const injury = actorRound.resolvePoisonExposure(exposure.id, { ...failed(undefined, 0), resisted: true }, ROWS, random);
    expect(injury).toBeUndefined();
    expect(actorRound.poisonExposures).toHaveLength(0);
    expect(actorRound.injuries).toHaveLength(0);
  });

  it('a failed RR is a poison-disease injury with the immediate hits', () => {
    const { actorRound, injury } = poisoned('mild', { ...POISON, immediateHits: { min: 4, max: 4 } });
    expect(injury).toMatchObject({ type: 'poison-disease', severity: 'light', penalty: 0, description: 'Test venom' });
    expect(injury.poison).toMatchObject({ severity: 'mild', level: 5, elapsedRounds: 0 });
    expect(actorRound.hp.current).toBe(46);
    expect(actorRound.hpLog.at(-1)).toMatchObject({ kind: 'poison', amount: -4, injuryId: injury.id });
  });

  it('an irritant makes no injury', () => {
    const actorRound = load();
    const exposure = actorRound.exposeToPoison({ ...POISON, category: 'irritant' });
    expect(actorRound.resolvePoisonExposure(exposure.id, failed('extreme'), ROWS, random)).toBeUndefined();
    expect(actorRound.injuries).toHaveLength(0);
  });

  it('starts the stages in the upkeep, with their penalties, hits and conditions', () => {
    const { actorRound, injury } = poisoned('severe');
    actorRound.applyUpkeep(); // round 1: nothing yet
    expect(actorRound.findInjury(injury.id).penalty).toBe(0);
    actorRound.applyUpkeep(); // round 2: mild and moderate start
    expect(actorRound.findInjury(injury.id).penalty).toBe(-30);
    expect(actorRound.getPenaltiesBySource().find(p => p.source === 'injury')?.value).toBe(-30);
    expect(actorRound.hp.current).toBe(47);
    actorRound.applyUpkeep();
    actorRound.applyUpkeep(); // round 4: severe starts
    actorRound.applyUpkeep(); // round 5: paralyzed
    const paralyzed = actorRound.effects.find(effect => effect.status === 'paralyzed');
    expect(paralyzed?.source).toMatchObject({ kind: 'poison', injuryId: injury.id });
    expect(actorRound.findInjury(injury.id).poison?.elapsedRounds).toBe(5);
  });

  it('ends the stages and keeps the injury for the recovery when the last one ends', () => {
    const { actorRound, injury } = poisoned('moderate');
    for (let round = 0; round < 8; round++) actorRound.applyUpkeep();
    const healed = actorRound.findInjury(injury.id);
    expect(healed.poison?.finished).toBe(true);
    expect(healed.penalty).toBe(0);
    expect(healed.initialPenalty).toBe(-30);
    expect(healed.status).toBe('active');
  });

  it('a permanent stage leaves a permanent injury', () => {
    const rows = [row('mild', { permanent: true })];
    const actorRound = load();
    const exposure = actorRound.exposeToPoison(POISON);
    const injury = actorRound.resolvePoisonExposure(exposure.id, failed('mild'), rows, random)!;
    for (let round = 0; round < 8; round++) actorRound.applyUpkeep();
    expect(actorRound.findInjury(injury.id)).toMatchObject({ status: 'permanent', penalty: -10, permanent: { penalty: -10 } });
  });

  it('dies at the extreme stage', () => {
    const { actorRound } = poisoned('extreme');
    for (let round = 0; round < 5; round++) actorRound.applyUpkeep();
    expect(actorRound.isDead()).toBe(true);
  });

  it('an antidote that fits neutralizes the poisoning and ends its conditions', () => {
    const { actorRound, injury } = poisoned('severe');
    for (let round = 0; round < 5; round++) actorRound.applyUpkeep();
    const result = actorRound.giveAntidote(injury.id, { source: 'item', name: 'Cure', categories: ['muscle'], level: 5 });
    expect(result.neutralized).toBe(true);
    const cured = actorRound.findInjury(injury.id);
    expect(cured.poison).toMatchObject({ neutralized: true, finished: true });
    expect(cured.poison?.antidotes).toHaveLength(1);
    expect(cured.penalty).toBe(0);
    expect(actorRound.effects.some(effect => effect.status === 'paralyzed')).toBe(false);
    const elapsed = cured.poison?.elapsedRounds;
    actorRound.applyUpkeep();
    expect(actorRound.findInjury(injury.id).poison?.elapsedRounds).toBe(elapsed);
  });

  it('an antidote that does not fit is kept and changes nothing', () => {
    const { actorRound, injury } = poisoned('mild');
    const result = actorRound.giveAntidote(injury.id, { source: 'item', name: 'Wrong', categories: ['nerve'], level: 10 });
    expect(result.neutralized).toBe(false);
    expect(actorRound.findInjury(injury.id).poison).toMatchObject({ antidotes: [{ name: 'Wrong', neutralized: false }] });
    expect(actorRound.findInjury(injury.id).poison?.finished).toBeUndefined();
  });

  it('rejects an antidote for an injury that is not a poisoning', () => {
    const actorRound = load({
      injuries: [
        {
          id: 'cut',
          type: 'cut-burn',
          severity: 'light',
          penalty: -5,
          initialPenalty: -5,
          source: { kind: 'manual' },
          treatments: [],
          status: 'active',
          createdAt: '',
        },
      ],
    });
    expect(() => actorRound.giveAntidote('cut', { source: 'magic', name: 'Cure' })).toThrow('not a poisoning');
  });

  it('carries the exposures and a separate copy of the poisonings to the next round', async () => {
    const { ActorRound } = await import('../../../src/modules/actor-rounds/domain/aggregates/actor-round.js');
    const { actorRound, injury } = poisoned('moderate');
    actorRound.exposeToPoison(POISON);
    const next = ActorRound.createFromPrevious(actorRound);
    expect(next.poisonExposures).toHaveLength(1);
    next.applyUpkeep();
    expect(next.findInjury(injury.id).poison?.elapsedRounds).toBe(1);
    expect(actorRound.findInjury(injury.id).poison?.elapsedRounds).toBe(0);
  });
});
