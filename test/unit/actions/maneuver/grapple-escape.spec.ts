import { describe, expect, it, vi } from 'vitest';
import {
  ManeuverRoll,
  ResolveManeuverCommand,
  ResolveManeuverRequest,
} from '../../../../src/modules/actions/application/cqrs/commands/resolve-maneuver.command.js';
import { ResolveMovementCommand } from '../../../../src/modules/actions/application/cqrs/commands/resolve-movement.command.js';
import { ResolveManeuverHandler } from '../../../../src/modules/actions/application/cqrs/handlers/resolve-maneuver.handler.js';
import { ResolveMovementHandler } from '../../../../src/modules/actions/application/cqrs/handlers/resolve-movement.handler.js';
import type { ActionRepository } from '../../../../src/modules/actions/application/ports/action-repository.port.js';
import type { PercentManeuverResponse } from '../../../../src/modules/actions/application/ports/maneuver.port.js';
import { CombatFightingStyleSourcePlugin } from '../../../../src/modules/actions/application/services/combat/index.js';
import type { MovementProcessorService } from '../../../../src/modules/actions/application/services/movement-processor.service.js';
import type { GrappleEscapeRow } from '../../../../src/modules/actions/domain/services/grapple-escape.js';
import type { ActorRoundRepository } from '../../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import type { ActorRound } from '../../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import type { ActorRoundActiveStyle } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-fighting-style.vo.js';
import { ActorRoundEffect } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game-repository.port.js';
import type { StrategicGamePort } from '../../../../src/modules/strategic/application/ports/strategic-game.port.js';
import { load } from '../../actor-rounds/actor-round-test.factory.js';
import { createCombatPluginContext, rollModifierValues, runPluginHook } from '../combat/combat-plugin-test.factory.js';
import { action, breakdown, setupManeuver } from './maneuver-test.factory.js';

// Workspace spec 077, block A3 (§9.8 grapple). Invented data.

/** A grapple of `grapplerId` (none: an object such as a net or a vine). */
const grapple = (id: string, value: number, grapplerId?: string) =>
  new ActorRoundEffect(id, 'grappled', value, undefined, undefined, undefined, undefined, grapplerId);

/** The bands of core's percent maneuver table up to 130 (rmu-api-core percent-maneuver.service.ts). */
const percentTable = (total: number): PercentManeuverResponse => {
  if (total <= -20) return { percent: 0, critical: 'A', message: 'Received critical A' };
  if (total <= 0) return { percent: 0, critical: null, message: 'Fail to act' };
  if (total <= 10) return { percent: 5, critical: null, message: 'Completed at 5%' };
  if (total <= 100) return { percent: Math.floor((total - 1) / 10) * 10, critical: null, message: 'Completed' };
  return { percent: 100, critical: null, message: 'Completed at 100%' };
};

const escape = async (rows: GrappleEscapeRow[] | undefined, options: { skillId?: string; grapples?: ActorRoundEffect[] } = {}) => {
  const setup = setupManeuver({
    skillId: options.skillId ?? 'contortions',
    phase: 'phase_4',
    actorRound: round => round.applyAttackResults(undefined, options.grapples ?? [], undefined),
  });
  setup.percent.mockImplementation(total => Promise.resolve(percentTable(total)));
  const request = Object.assign(new ResolveManeuverRequest(undefined, {}), { purpose: 'grapple-escape', grappleEscape: rows });
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
    new ResolveManeuverCommand('action-1', request, new ManeuverRoll(undefined as unknown as number), 'user-1', []),
  );
  return { setup, result };
};

describe('Grapple escape (workspace spec 077, decision A3.3)', () => {
  it('rolls once against a vine and once against a grappler, with the whole penalty, in the same action', async () => {
    const grapples = [grapple('vine', 10), grapple('foe', 20, 'foe-1')];
    // Skill +40, penalty -30: the vine (object) takes no conflict; the grappler adds 100 - 168.
    const { setup, result } = await escape(
      [
        { effectId: 'vine', roll: 101 },
        { effectId: 'foe', roll: 70, passiveTotal: 168 },
      ],
      { grapples },
    );

    expect(result.apRange).toEqual({ min: 2, max: 4 });
    expect(result.maneuver!.modifiers).toMatchObject({ purpose: 'grapple-escape', maneuverType: 'percent', skillId: 'contortions' });
    expect(breakdown(result.maneuver!.roll!.modifiers)).toMatchObject({ roll: 101, 'penalty-grappled': -30 });
    expect(result.maneuver!.result!.grappleEscape).toEqual([
      expect.objectContaining({ effectId: 'vine', total: 111, percent: 100, remaining: 0, released: true, difficulty: 'm' }),
      expect.objectContaining({ effectId: 'foe', grapplerId: 'foe-1', passiveTotal: 168, total: 12, percent: 10, remaining: 10 }),
    ]);
    expect(breakdown(result.maneuver!.result!.grappleEscape![1].modifiers)).toMatchObject({ conflict: -68 });
    expect(result.maneuver!.result!.completed).toBe(false);
    expect(setup.actorRound.grapples()).toEqual([expect.objectContaining({ id: 'foe', value: 10 })]);
    expect(setup.actorRound.getPenaltiesBySource().find(p => p.source === 'grappled')?.value).toBe(-10);
    expect(setup.actorRoundUpdate).toHaveBeenCalledWith(setup.actorRound);
    expect(result.status).toBe('completed');
  });

  it('uses the difficulty the game master picks for each grapple', async () => {
    const { result } = await escape([{ effectId: 'vine', roll: 60, difficulty: 'h' }], { grapples: [grapple('vine', 10)] });

    const [row] = result.maneuver!.result!.grappleEscape!;
    expect(row).toMatchObject({ difficulty: 'h', total: 60 + 40 - 10 - 10 });
  });

  it('an absolute failure of Contortions tightens the grapple; with Wrestling it just fails', async () => {
    const tightened = await escape([{ effectId: 'foe', roll: -60, passiveTotal: 100 }], { grapples: [grapple('foe', 20, 'foe-1')] });
    expect(tightened.result.maneuver!.result!.grappleEscape![0]).toMatchObject({ critical: 'A', percent: 0, tightened: true });
    expect(tightened.setup.actorRound.grapples()[0].data).toMatchObject({ tightened: true });

    const wrestling = await escape([{ effectId: 'foe', roll: -60, passiveTotal: 100 }], {
      skillId: 'unarmed-ag',
      grapples: [grapple('foe', 20, 'foe-1')],
    });
    expect(wrestling.result.maneuver!.result!.grappleEscape![0].tightened).toBeUndefined();
    expect(wrestling.setup.actorRound.grapples()[0].data?.tightened).toBeUndefined();
  });

  it('rejects an escape it cannot make', async () => {
    const grapples = [grapple('foe', 20, 'foe-1')];
    await expect(escape([{ effectId: 'foe', roll: 50, passiveTotal: 90 }], { skillId: 'old-lore', grapples })).rejects.toMatchObject({
      code: 'err-maneuver-purpose-skill',
    });
    await expect(escape([{ effectId: 'foe', roll: 50, passiveTotal: 90 }])).rejects.toMatchObject({ code: 'err-grapple-not-grappled' });
    await expect(escape([{ effectId: 'other', roll: 50 }], { grapples })).rejects.toMatchObject({ code: 'err-grapple-effect-not-found' });
    await expect(escape([], { grapples })).rejects.toMatchObject({ code: 'err-grapple-escape-required' });
    await expect(escape([{ effectId: 'foe', roll: 50 }], { grapples })).rejects.toMatchObject({
      code: 'err-maneuver-passive-roll-required',
    });
    const blocked = grapple('foe', 20, 'foe-1');
    blocked.data = { tightened: true };
    await expect(escape([{ effectId: 'foe', roll: 50, passiveTotal: 90 }], { grapples: [blocked] })).rejects.toMatchObject({
      code: 'err-grapple-escape-blocked',
    });
  });
});

describe('Fight Free (workspace spec 077, decision A3.2)', () => {
  const fightFree: ActorRoundActiveStyle = {
    skillId: 'combat-styles',
    styleId: 'test-style',
    met: true,
    attackNames: null,
    freeRanksBonus: 0,
    abilities: [{ abilityId: 'fight-free', times: 1, met: true, attackNames: null }],
    warnings: [],
    options: [],
  };

  const prepare = async (weaponCategory: 'unarmed' | 'standard', ...values: number[]) => {
    const ctx = createCombatPluginContext({ weaponCategory });
    ctx.sourceActor!.activeStyle = fightFree;
    ctx.sourceActor!.effects.push(...values.map((value, i) => grapple(`g${i}`, value, `foe-${i}`)));
    await runPluginHook(CombatFightingStyleSourcePlugin, 'prepare', ctx);
    return rollModifierValues(ctx);
  };

  it('halves the grapple penalty of the unarmed attacks below 100', async () => {
    expect(await prepare('unarmed', 30, 15)).toEqual({ 'fight-free': 22 });
    expect(await prepare('standard', 30)).toEqual({});
    expect(await prepare('unarmed', 60, 40)).toEqual({});
  });
});

describe('Movement of a grappled actor (workspace spec 077, decision A3.5)', () => {
  const move = async (actorRound: ActorRound, others: ActorRound[], grappleFeat?: 'passed' | 'failed') => {
    const movement = action({ id: 'move-1', actionType: 'movement', movement: null });
    actorRound.spend(1, 'move-1', 1);
    const process = vi.fn(() => Promise.reject(new Error('processed')));
    const handler = new ResolveMovementHandler(
      { process } as unknown as MovementProcessorService,
      {
        findById: vi.fn(() => Promise.resolve({ id: 'game-1', round: 1, strategicGameId: 'sg-1', getActionPhase: () => 1 })),
      } as unknown as GameRepository,
      {
        findByActorIdAndRound: vi.fn(() => Promise.resolve(actorRound)),
        findByRsql: vi.fn(() => Promise.resolve({ content: [actorRound, ...others] })),
      } as unknown as ActorRoundRepository,
      {
        findById: vi.fn(() => Promise.resolve(movement)),
        findByRsql: vi.fn(() => Promise.resolve({ content: [] })),
      } as unknown as ActionRepository,
      { findById: vi.fn(() => Promise.resolve({ id: 'sg-1' })) } as unknown as StrategicGamePort,
      { publish: vi.fn() },
    );
    const modifiers = { pace: 'walk', requiredManeuver: false, ...(grappleFeat ? { grappleFeat } : {}) };
    return handler.execute(new ResolveMovementCommand('move-1', modifiers as never, null, null, 'user-1', []));
  };

  it('needs the Feat of Strength of the grappled actor and of its grappler', async () => {
    const victim = load();
    victim.applyAttackResults(undefined, [grapple('foe', 20, 'grappler')], undefined);
    await expect(move(victim, [])).rejects.toMatchObject({ code: 'err-movement-grappled' });

    const grappler = Object.assign(load(), { id: 'grappler-round', actorId: 'grappler' });
    const held = Object.assign(load(), { id: 'held-round', actorId: 'held' });
    held.applyAttackResults(undefined, [grapple('foe', 20, 'grappler')], undefined);
    await expect(move(grappler, [held])).rejects.toMatchObject({ code: 'err-movement-grappled' });

    await expect(move(Object.assign(load(), { id: 'free-round', actorId: 'free' }), [held])).rejects.toThrow('processed');
    await expect(move(load(), [], 'failed')).rejects.toThrow('processed');
  });
});
