import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import { describe, expect, it, vi } from 'vitest';
import type { EnduranceManeuverResult, ManeuverPort } from '../../../src/modules/actions/application/ports/maneuver.port.js';
import { ResolveEnduranceCheckCommand } from '../../../src/modules/actor-rounds/application/cqrs/commands/resolve-endurance-check.command.js';
import { ResolveEnduranceCheckHandler } from '../../../src/modules/actor-rounds/application/cqrs/handlers/resolve-endurance-check.handler.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundAlert } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-alert.vo.js';
import { load } from './actor-round-test.factory.js';

const fatiguePenalty = (round: ActorRound) => round.getPenaltiesBySource().find(p => p.source === 'fatigue')?.value;

describe('ActorRound fatigue (§5.5)', () => {
  it('turns the accumulated fatigue into a penalty to all actions', () => {
    const round = load();
    round.applyEnduranceResult(10, 0);
    round.applyEnduranceResult(5, 0);
    expect(round.fatigue.fatigue).toBe(15);
    expect(fatiguePenalty(round)).toBe(-15);
  });

  it('shakes off fatigue on an absolute success, never below zero', () => {
    const round = load();
    round.applyEnduranceResult(15, 0);
    round.applyEnduranceResult(-10, 0);
    expect(fatiguePenalty(round)).toBe(-5);
    round.applyEnduranceResult(-10, 0);
    expect(round.fatigue.fatigue).toBe(0);
    expect(fatiguePenalty(round)).toBeUndefined();
  });

  it('applies the hits of an absolute failure', () => {
    const round = load({ hp: [50, 50] });
    round.applyEnduranceResult(20, 10);
    expect(round.hp.current).toBe(40);
    expect(fatiguePenalty(round)).toBe(-20);
  });

  it('caps the fatigue at -50: the rest becomes an injury of unknown type with a fatigue source (spec 013)', () => {
    const round = load({ hp: [100, 100] });
    round.applyEnduranceResult(45, 0);
    round.applyEnduranceResult(10, 0, undefined, 'Moria');
    expect(fatiguePenalty(round)).toBe(-50);
    expect(round.hp.current).toBe(100);
    expect(round.injuries).toEqual([
      expect.objectContaining({
        type: 'unknown',
        penalty: -5,
        severity: 'light',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- nested asymmetric matcher (typed any)
        source: expect.objectContaining({ kind: 'fatigue', tacticalGameName: 'Moria' }),
      }),
    ]);
    expect(round.getPenaltiesBySource()).toContainEqual({ source: 'injury', value: -5 });

    round.applyEnduranceResult(10, 0);

    expect(round.injuries).toHaveLength(1);
    expect(round.injuries[0].penalty).toBe(-15);
  });

  it('keeps the fatigue penalty when it is read again from the repository', () => {
    const round = load();
    round.applyEnduranceResult(10, 0);
    const reloaded = ActorRound.fromProps({ ...round.getProps(), penalty: round.penalty });
    expect(fatiguePenalty(reloaded)).toBe(-10);
  });

  it('uses up the activity points of the roll and its alert', () => {
    const round = load();
    round.addFatigue(120);
    expect(round.alerts.map(a => a.type)).toEqual(['endurance']);
    round.applyEnduranceResult(0, 0, round.alerts[0].id);
    expect(round.fatigue.accumulator).toBe(20);
    expect(round.alerts).toEqual([]);
  });

  it('carries the fatigue into the next round', () => {
    const round = load();
    round.applyEnduranceResult(10, 0);
    expect(fatiguePenalty(ActorRound.createFromPrevious(round))).toBe(-10);
  });
});

describe('ResolveEnduranceCheckHandler', () => {
  const setup = (endurance: { fatigue: number; hitPoints: number }) => {
    const round = load({ hp: [50, 50] });
    const alert = ActorRoundAlert.buildEndurance();
    round.alerts.push(alert);
    const actorRoundRepository = {
      findById: vi.fn(() => Promise.resolve(round)),
      update: vi.fn((updated: ActorRound) => Promise.resolve(updated)),
    } as unknown as ActorRoundRepository;
    const enduranceFn = vi.fn<(roll: number) => Promise<EnduranceManeuverResult>>(() =>
      Promise.resolve({ result: 'failure', message: 'Tired', bonus: 0, ...endurance }),
    );
    const maneuverPort = { endurance: enduranceFn } as unknown as ManeuverPort;
    const gameRepository = { findById: vi.fn(() => Promise.resolve(null)) } as unknown as GameRepository;
    const handler = new ResolveEnduranceCheckHandler(actorRoundRepository, maneuverPort, gameRepository);
    return { handler, alert, enduranceFn };
  };

  it('criterion 10: a failed endurance roll leaves a fatigue penalty for the next maneuvers', async () => {
    const { handler, alert, enduranceFn } = setup({ fatigue: 10, hitPoints: 0 });
    const updated = await handler.execute(
      new ResolveEnduranceCheckCommand('ar-1', alert.id, 40, [{ key: 'body-development', value: 20 }], 'user-1', []),
    );
    expect(enduranceFn).toHaveBeenCalledWith(60);
    expect(fatiguePenalty(updated)).toBe(-10);
    expect(updated.alerts).toEqual([]);
  });

  it('rejects an alert the actor round does not have', async () => {
    const { handler } = setup({ fatigue: 0, hitPoints: 0 });
    await expect(handler.execute(new ResolveEnduranceCheckCommand('ar-1', 'nope', 40, [], 'user-1', []))).rejects.toThrow('nope');
  });
});
