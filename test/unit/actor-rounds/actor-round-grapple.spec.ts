import { describe, expect, it, vi } from 'vitest';
import { AddEffectsCommand } from '../../../src/modules/actor-rounds/application/cqrs/commands/add-effects.command.js';
import { AddEffectsHandler } from '../../../src/modules/actor-rounds/application/cqrs/handlers/add-effects.handler.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import type { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundEffect } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import { effect, load } from './actor-round-test.factory.js';

// Workspace spec 077, block A3 (§9.8 grapple). Invented data.

let sequence = 0;

/** A grapple from a critical of `attackerId` (none: an object). */
const grapple = (value: number, attackerId?: string) => {
  sequence += 1;
  return new ActorRoundEffect(
    `grapple-${sequence}`,
    'grappled',
    value,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    attackerId ? { kind: 'critical', attackerId } : undefined,
  );
};

const grappled = (...effects: ActorRoundEffect[]) => {
  const round = load();
  round.applyAttackResults(undefined, effects, undefined);
  return round;
};

const grapplePenalty = (round: ActorRound) => round.getPenaltiesBySource().find(p => p.source === 'grappled')?.value ?? 0;

describe('Grapple (workspace spec 077, block A3)', () => {
  it('adds up the grapples of the same grappler: 30 + 10 give -40 (decision A3.1)', () => {
    const round = grappled(grapple(30, 'foe-1'), grapple(10, 'foe-1'));

    expect(round.grapples()).toEqual([expect.objectContaining({ value: 40, targetActorId: 'foe-1' })]);
    expect(grapplePenalty(round)).toBe(-40);
    expect(round.getPenaltySum()).toBe(-40);
  });

  it('keeps one grapple per grappler and marks the objects', () => {
    const round = grappled(grapple(15, 'foe-1'), grapple(20, 'foe-2'), grapple(5));

    expect(round.grapples().map(g => [g.targetActorId, g.value, g.data?.object])).toEqual([
      ['foe-1', 15, undefined],
      ['foe-2', 20, undefined],
      [undefined, 5, true],
    ]);
    expect(grapplePenalty(round)).toBe(-40);
    expect(round.isGrappledBy('foe-2')).toBe(true);
  });

  it('caps the penalty at -100 (decision A3.2, P3)', () => {
    const round = grappled(grapple(70, 'foe-1'), grapple(60, 'foe-2'));

    expect(grapplePenalty(round)).toBe(-100);
  });

  it('requires a percent', () => {
    expect(() => grappled(grapple(0, 'foe-1'))).toThrow(expect.objectContaining({ code: 'err-effect-invalid-value' }));
  });

  it('an escape lowers the grapple by its percent and removes it at 0 (decision A3.3, P5)', () => {
    const round = grappled(grapple(30, 'foe-1'), grapple(10));
    const [held, object] = round.grapples();

    expect(round.escapeGrapple(held.id, 20)).toEqual({ remaining: 10, released: false, tightened: false });
    expect(grapplePenalty(round)).toBe(-20);
    expect(round.escapeGrapple(object.id, 50)).toEqual({ remaining: 0, released: true, tightened: false });
    expect(round.grapples()).toHaveLength(1);
    expect(grapplePenalty(round)).toBe(-10);
  });

  it('a tightened grapple blocks the escapes (decision A3.6)', () => {
    const round = grappled(grapple(30, 'foe-1'));
    const [held] = round.grapples();

    expect(round.escapeGrapple(held.id, 0, true)).toEqual({ remaining: 30, released: false, tightened: true });
    expect(() => round.findGrapple(held.id)).toThrow(expect.objectContaining({ code: 'err-grapple-escape-blocked' }));
    expect(() => round.findGrapple('other')).toThrow(expect.objectContaining({ code: 'err-grapple-effect-not-found' }));
    expect(() => load().findGrapple(held.id)).toThrow(expect.objectContaining({ code: 'err-grapple-not-grappled' }));
  });

  it('releasing the grapples of a grappler removes its penalty', () => {
    const round = grappled(grapple(30, 'foe-1'), grapple(10, 'foe-2'));

    expect(round.releaseGrapplesOf('foe-1')).toHaveLength(1);
    expect(grapplePenalty(round)).toBe(-10);
  });

  it('a stunned grappler lets go of the actors of the round (decision A3.4)', async () => {
    const grappler = Object.assign(load(), { id: 'grappler-round', actorId: 'foe-1', actorName: 'Grappler' });
    const victim = Object.assign(grappled(grapple(30, 'foe-1'), grapple(10, 'foe-2')), { id: 'victim-round', actorName: 'Victim' });
    const update = vi.fn((updated: ActorRound) => Promise.resolve(updated));
    const findByRsql = vi.fn(() => Promise.resolve({ content: [grappler, victim] }));
    const handler = new AddEffectsHandler(
      { findById: vi.fn(() => Promise.resolve(grappler)), findByRsql, update } as unknown as ActorRoundRepository,
      { findById: vi.fn(() => Promise.resolve(null)) } as unknown as GameRepository,
    );

    await handler.execute(new AddEffectsCommand('grappler-round', 0, [effect('stunned', -25, 1)], undefined, 'user', []));

    expect(findByRsql).toHaveBeenCalledWith('gameId==game-1;round==1', 0, 1000);
    expect(victim.grapples().map(g => g.targetActorId)).toEqual(['foe-2']);
    expect(update).toHaveBeenCalledWith(victim);

    findByRsql.mockClear();
    await handler.execute(new AddEffectsCommand('grappler-round', 0, [effect('haste', 1)], undefined, 'user', []));
    expect(findByRsql).not.toHaveBeenCalled();
  });
});
