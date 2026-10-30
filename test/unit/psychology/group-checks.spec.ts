import { describe, expect, it, vi } from 'vitest';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import type { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundTrait } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import {
  FearCheckCommand,
  type FearCheckRequest,
  type LeaderRollRequest,
  MoraleCheckCommand,
  type MoraleCheckRequest,
  RallyCheckCommand,
} from '../../../src/modules/psychology/application/cqrs/commands/group-check.commands.js';
import { FearCheckHandler } from '../../../src/modules/psychology/application/cqrs/handlers/fear-check.handler.js';
import { MoraleCheckHandler, RallyCheckHandler } from '../../../src/modules/psychology/application/cqrs/handlers/leader-checks.handler.js';
import { GroupCheckService } from '../../../src/modules/psychology/application/services/group-check.service.js';
import { openEndedRoll } from '../../../src/modules/psychology/domain/services/open-ended-roll.js';
import type { CharacterPort } from '../../../src/modules/strategic/application/ports/character.port.js';
import { PSYCHOLOGY_TABLES } from '../../fixtures/psychology-tables.js';
import { effect, load } from '../actor-rounds/actor-round-test.factory.js';

type Options = Parameters<typeof load>[0] & { actorId: string; character?: boolean };

const actor = ({ actorId, character, ...options }: Options): ActorRound =>
  Object.assign(load({ factionId: 'fellowship', ...options }), {
    id: `round-${actorId}`,
    actorId,
    actorName: actorId,
    actorType: character ? 'character' : 'npc',
    characterId: character ? actorId : undefined,
  });

const sheets: Record<string, object> = {
  aragorn: { id: 'aragorn', skills: [{ skillId: 'leadership', specialization: null, ranks: 10, totalBonus: 40 }] },
  witch: { id: 'witch', skills: [{ skillId: 'influence', specialization: 'intimidation', ranks: 7, totalBonus: 50 }] },
};

const setup = (extra: { round?: number; effects?: Record<string, ReturnType<typeof effect>[]> } = {}) => {
  const fx = extra.effects ?? {};
  const rounds = [
    actor({
      actorId: 'aragorn',
      character: true,
      traits: [new ActorRoundTrait('look-of-eagles', 2, null)],
      resistances: [{ resistance: 'fear', totalBonus: 40 }],
      effects: fx.aragorn,
    }),
    actor({ actorId: 'boromir', resistances: [{ resistance: 'fear', totalBonus: 20 }], effects: fx.boromir }),
    actor({ actorId: 'orc', effects: fx.orc }),
    actor({ actorId: 'fallen', effects: [effect('dead')] }),
    actor({ actorId: 'witch', character: true, factionId: 'mordor' }),
    actor({ actorId: 'troll', factionId: 'mordor' }),
  ];
  const game = { id: 'game-1', name: 'Amon Hen', round: extra.round ?? 1, checkNotFinished: vi.fn() };
  const games = { findById: vi.fn(() => Promise.resolve(game)) } as unknown as GameRepository;
  const update = vi.fn((round: ActorRound) => Promise.resolve(round));
  const actorRounds = { findByRsql: vi.fn(() => Promise.resolve({ content: rounds })), update } as unknown as ActorRoundRepository;
  const characters = { findById: vi.fn((id: string) => Promise.resolve(sheets[id])) } as unknown as CharacterPort;
  const service = new GroupCheckService(games, actorRounds, characters);
  const tables = { find: vi.fn(() => Promise.resolve(PSYCHOLOGY_TABLES)) };
  return {
    rounds,
    update,
    fear: (request: FearCheckRequest) => new FearCheckHandler(service, tables).execute(new FearCheckCommand('game-1', request, 'u', [])),
    morale: (request: MoraleCheckRequest) =>
      new MoraleCheckHandler(service, tables).execute(new MoraleCheckCommand('game-1', request, 'u', [])),
    rally: (request: LeaderRollRequest) =>
      new RallyCheckHandler(service, tables).execute(new RallyCheckCommand('game-1', request, 'u', [])),
  };
};

const byId = <T extends { actorId: string }>(list: T[], id: string) => list.find(each => each.actorId === id)!;

describe('FearCheckHandler (workspace spec 022, decision 9)', () => {
  it('rolls the fear RR of each actor of the leader faction with the leader bonus and frightens who fails', async () => {
    const { fear, update, rounds } = setup();
    const result = await fear({ frightLevel: 5, leader: { actorId: 'aragorn' }, rolls: { aragorn: 30, boromir: 50, orc: 10 } });
    // Leader: 10 Leadership ranks + 2 x Look of Eagles tier 2.
    expect(result.leader).toMatchObject({ leadershipRanks: 10, leadershipBonus: 40, lookOfEaglesTier: 2, fearRrBonus: 14 });
    expect(result.actors.map(each => each.actorId)).toEqual(['aragorn', 'boromir', 'orc', 'fallen']);
    expect(byId(result.actors, 'aragorn')).toMatchObject({ status: 'afraid', total: 55, failure: 5, effect: 'fear-balk' });
    expect(byId(result.actors, 'boromir')).toMatchObject({ status: 'resisted', total: 69, failure: 0, effect: undefined });
    expect(byId(result.actors, 'boromir').breakdown).toContainEqual({ key: 'leader', value: 14, group: 'situation' });
    expect(byId(result.actors, 'orc')).toMatchObject({
      status: 'afraid',
      bonus: 0,
      failure: 51,
      severity: 'severe',
      effect: 'fear-routed',
      restrictions: ['no-attacks'],
      warnings: ['no-fear-rr-bonus'],
    });
    expect(byId(result.actors, 'fallen').status).toBe('skipped');
    expect(update).toHaveBeenCalledTimes(2);
    expect(byId(rounds, 'orc').fearEffect()).toMatchObject({ status: 'fear-routed', value: 51 });
  });

  it('keeps a worse fear and saves nothing when nobody changes', async () => {
    const { fear, update } = setup({ effects: { troll: [] } });
    const first = await fear({ frightLevel: 0, group: { actorIds: ['troll'] }, rolls: { troll: 25 }, bonuses: { troll: 0 } });
    expect(byId(first.actors, 'troll').effect).toBe('fear-retreat');
    const again = await fear({ frightLevel: 0, group: { actorIds: ['troll'] }, rolls: { troll: 50 }, bonuses: { troll: 0 } });
    expect(byId(again.actors, 'troll')).toMatchObject({ previousEffect: 'fear-retreat', effect: 'fear-retreat' });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('takes the Intimidation ranks of the intimidating actor as the fright level, and no leader bonus if not recognized', async () => {
    const { fear } = setup();
    const result = await fear({
      intimidatorActorId: 'witch',
      group: { factionIds: ['fellowship'] },
      leader: { actorId: 'aragorn', recognized: false },
      rolls: { aragorn: 90, boromir: 90, orc: 90 },
    });
    expect(result.frightLevel).toBe(7);
    expect(result.leader?.fearRrBonus).toBe(0);
    expect(byId(result.actors, 'boromir').breakdown?.map(term => term.key)).toEqual(['roll', 'fear-rr', 'attack-level']);
    const npc = await fear({ intimidatorActorId: 'troll', intimidationRanks: 3, group: { actorIds: ['orc'] }, rolls: { orc: 90 } });
    expect(npc.frightLevel).toBe(3);
  });

  it('rolls for the actors the client did not', async () => {
    const result = await setup().fear({ frightLevel: 1, group: { actorIds: ['boromir'] } });
    expect(result.actors[0].rolledByServer).toBe(true);
  });

  it('refuses a check without fright level, group or a known actor', async () => {
    const { fear } = setup();
    const code = (code: string): unknown => expect.objectContaining({ code });
    await expect(fear({ group: { actorIds: ['orc'] } })).rejects.toThrow(code('err-fright-level-required'));
    await expect(fear({ frightLevel: 1 })).rejects.toThrow(code('err-group-required'));
    await expect(fear({ frightLevel: 1, group: { actorIds: ['nobody'] } })).rejects.toThrow(code('err-group-actor-not-found'));
    await expect(fear({ frightLevel: 1, group: { factionIds: ['rohan'] } })).rejects.toThrow(code('err-group-empty'));
    await expect(fear({ frightLevel: 1, leader: { actorId: 'nobody' }, group: { actorIds: ['orc'] } })).rejects.toThrow(
      code('err-leader-not-found'),
    );
    await expect(fear({ intimidatorActorId: 'nobody', group: { actorIds: ['orc'] } })).rejects.toThrow(code('err-intimidator-not-found'));
    await expect(fear({ intimidatorActorId: 'troll', group: { actorIds: ['orc'] } })).rejects.toThrow(
      code('err-intimidation-ranks-required'),
    );
    await expect(fear({ frightLevel: 1, group: { actorIds: ['orc'] }, rolls: { orc: Number.NaN } })).rejects.toThrow(
      code('err-group-invalid-roll'),
    );
    await expect(setup({ round: 0 }).fear({ frightLevel: 1, group: { actorIds: ['orc'] } })).rejects.toThrow(code('err-game-not-started'));
  });
});

describe('MoraleCheckHandler (workspace spec 022, decision 10)', () => {
  it('adds the Leadership bonus, the average fear RR of the followers and the difficulty', async () => {
    const result = await setup().morale({ leader: { actorId: 'aragorn' }, roll: 50, difficulty: 'h' });
    expect(result.leaderRoll).toMatchObject({ total: 100, result: 'partial-success' });
    expect(result.leaderRoll?.breakdown).toEqual([
      { key: 'roll', value: 50 },
      { key: 'leadership', value: 40 },
      { key: 'followers-fear-rr', value: 20 },
      { key: 'difficulty', value: -10 },
    ]);
    expect(result.outcome).toBe('needs-clarification');
    expect(byId(result.actors, 'orc').warnings).toEqual(['no-fear-rr-bonus']);
    expect(byId(result.actors, 'fallen').status).toBe('skipped');
    expect(result.actorRounds).toEqual([]);
  });

  it('reports the modifier of the result and the unusual event of an unmodified 66', async () => {
    const { morale } = setup();
    const low = await morale({ leader: { actorId: 'aragorn' }, roll: -100, bonuses: { orc: 10 } });
    expect(low).toMatchObject({ outcome: 'refuses-hostile', moraleModifier: -5, moraleModifierDays: 10 });
    const odd = await morale({ leader: { actorId: 'aragorn' }, roll: 66 });
    expect(odd.outcome).toBe('misunderstands-order');
    expect(odd.leaderRoll?.unusualEvent).toEqual({ roll: 66, outcome: 'misunderstands-order' });
  });

  it('needs a leader with followers and a known difficulty', async () => {
    const { morale } = setup();
    const code = (code: string): unknown => expect.objectContaining({ code });
    await expect(morale({ roll: 50 })).rejects.toThrow(code('err-leader-required'));
    await expect(morale({ leader: { actorId: 'aragorn' }, group: { actorIds: ['aragorn'] } })).rejects.toThrow(
      code('err-morale-no-followers'),
    );
    await expect(morale({ leader: { actorId: 'aragorn' }, difficulty: 'zz' as never })).rejects.toThrow(
      code('err-morale-invalid-difficulty'),
    );
  });
});

describe('RallyCheckHandler (workspace spec 022, decision 10)', () => {
  it('takes the worst fear and the number of followers, and calms every frightened follower', async () => {
    const { rally, update } = setup({ effects: { orc: [effect('fear-routed', 30)], boromir: [effect('fear-balk', 5)] } });
    const result = await rally({ leader: { actorId: 'aragorn' }, roll: 100 });
    expect(result.leaderRoll?.breakdown).toEqual([
      { key: 'roll', value: 100 },
      { key: 'leadership', value: 40 },
      { key: 'worst-fear', value: -40 },
      { key: 'followers', value: -5 },
    ]);
    expect(result).toMatchObject({ fearSeverityChange: -1 });
    expect(byId(result.actors, 'orc')).toMatchObject({ previousEffect: 'fear-routed', effect: 'fear-retreat', restrictions: [] });
    expect(byId(result.actors, 'boromir')).toMatchObject({ previousEffect: 'fear-balk', effect: undefined });
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('can make it worse, saves nothing on no change and reports the unusual event', async () => {
    const { rally, update } = setup({ effects: { orc: [effect('fear-broken', 90)] } });
    const worse = await rally({ leader: { actorId: 'aragorn' }, roll: -100 });
    expect(byId(worse.actors, 'orc').effect).toBe('fear-broken');
    const same = await rally({ leader: { actorId: 'aragorn' }, roll: 66 + 35 - 40 });
    expect(same.fearSeverityChange).toBe(0);
    expect(same.leaderRoll?.unusualEvent).toBeUndefined();
    expect(update).toHaveBeenCalledTimes(1);
    const odd = await rally({ leader: { actorId: 'aragorn' }, roll: 140, unmodifiedRoll: 66 });
    expect(odd.leaderRoll?.unusualEvent).toMatchObject({ outcome: 'leader-fired-up', leaderFearRrBonus: 15 });
  });

  it('needs somebody afraid', async () => {
    await expect(setup().rally({ leader: { actorId: 'aragorn' }, roll: 50 })).rejects.toThrow(
      expect.objectContaining({ code: 'err-rally-nobody-afraid' }),
    );
  });
});

describe('openEndedRoll', () => {
  const sequence = (...values: number[]) => {
    let i = 0;
    return () => (values[i++] - 1) / 100;
  };

  it('rolls again and adds on 96-100, and subtracts on 1-5', () => {
    expect(openEndedRoll(sequence(50))).toEqual({ roll: 50, unmodified: 50 });
    expect(openEndedRoll(sequence(97, 99, 10))).toEqual({ roll: 206, unmodified: 97 });
    expect(openEndedRoll(sequence(3, 40))).toEqual({ roll: -37, unmodified: 3 });
    expect(GroupCheckService.roll(undefined, sequence(42))).toEqual({ roll: 42, unmodified: 42, rolledByServer: true });
  });
});
