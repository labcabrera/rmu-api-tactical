import { describe, expect, it } from 'vitest';
import type { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundTrait } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { buildInjury } from '../../../src/modules/actor-rounds/domain/value-objects/injury.vo.js';
import { fearStateOf } from '../../../src/modules/psychology/application/cqrs/handlers/fear-effect.handlers.js';
import { FearUpkeep } from '../../../src/modules/psychology/domain/services/fear-upkeep.js';
import { PSYCHOLOGY_TABLES } from '../../fixtures/psychology-tables.js';
import { effect, load } from '../actor-rounds/actor-round-test.factory.js';

type Options = Parameters<typeof load>[0] & { actorId: string };

const actor = ({ actorId, ...options }: Options): ActorRound => Object.assign(load({ factionId: 'fellowship', ...options }), { actorId });

const bleeding = (id: string, value: number) =>
  buildInjury({ id, type: 'cut-burn', penalty: -5, bleeding: value, source: { kind: 'critical' } });

// Made-up thresholds of the fixture: at least 40% → 3, above 40% → 6, above 70% → 9
const THRESHOLDS = PSYCHOLOGY_TABLES.fallenThresholds;

describe('suggested fear checks (workspace spec 068, decision 16)', () => {
  const faction = (fallen: number, total: number) =>
    Array.from({ length: total }, (_, i) =>
      actor({ actorId: `a${i}`, effects: i < fallen ? [effect(i % 2 === 0 ? 'dead' : 'fear-routed', 10)] : [] }),
    );

  it('suggests the highest threshold crossed, with its fright level and the share, to the first able actor', () => {
    const rounds = faction(2, 5);
    const [check] = FearUpkeep.suggestedChecks(rounds, THRESHOLDS, {});
    expect(check).toMatchObject({ factionId: 'fellowship', frightLevel: 3, fallenShare: 0.4, keys: ['0.4'] });
    expect(check.actorRound.actorId).toBe('a2');
    // A jump past several thresholds suggests the highest and marks every one
    expect(FearUpkeep.suggestedChecks(faction(4, 5), THRESHOLDS, {})[0]).toMatchObject({ frightLevel: 9, keys: ['0.4', '0.4+', '0.7+'] });
  });

  it('does not suggest a threshold already alerted in the game, nor below the first one', () => {
    expect(FearUpkeep.suggestedChecks(faction(2, 5), THRESHOLDS, { fellowship: ['0.4'] })).toEqual([]);
    expect(FearUpkeep.suggestedChecks(faction(3, 5), THRESHOLDS, { fellowship: ['0.4'] })[0]).toMatchObject({ frightLevel: 6 });
    expect(FearUpkeep.suggestedChecks(faction(1, 5), THRESHOLDS, {})).toEqual([]);
    // Without thresholds (an older core) nothing is suggested
    expect(FearUpkeep.suggestedChecks(faction(4, 5), null, {})).toEqual([]);
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
