import { describe, expect, it, vi } from 'vitest';
import type { AttackTablePort } from '../../../src/modules/actions/application/ports/attack-table.port.js';
import type { CriticalTableLookupRequest, CriticalTablePort } from '../../../src/modules/actions/application/ports/critical-table.port.js';
import { AttackTableEntry } from '../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { CriticalEffect, CriticalResult } from '../../../src/modules/actions/domain/value-objects/critical-result.vo.js';
import { ResolveCriticalAlertCommand } from '../../../src/modules/actor-rounds/application/cqrs/commands/resolve-critical-alert.command.js';
import { ResolveCriticalAlertHandler } from '../../../src/modules/actor-rounds/application/cqrs/handlers/resolve-critical-alert.handler.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { HazardAttackService } from '../../../src/modules/actor-rounds/application/services/hazard-attack.service.js';
import type { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundAlert } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-alert.vo.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import type { Game } from '../../../src/modules/games/domain/aggregates/game.js';
import { load } from './actor-round-test.factory.js';

/* Workspace spec 077, decision D3: invented criticals. */

const setup = (actor: ActorRound, critical = new CriticalResult('Twisted ankle.', 3, 'leg', [])) => {
  const lookups: CriticalTableLookupRequest[] = [];
  const criticalTable: CriticalTablePort = {
    lookup: vi.fn((req: CriticalTableLookupRequest) => {
      lookups.push(req);
      return Promise.resolve(critical);
    }),
  };
  const attackTable: AttackTablePort = { lookup: vi.fn(() => Promise.resolve(new AttackTableEntry('', 0, undefined, undefined))) };
  const repository = {
    findById: vi.fn(() => Promise.resolve(actor)),
    update: vi.fn((updated: ActorRound) => Promise.resolve(updated)),
  } as unknown as ActorRoundRepository;
  const game = { id: 'game-1', name: 'Moria', phase: 'phase_3', round: 1, checkNotFinished: () => undefined } as unknown as Game;
  const games = { findById: vi.fn(() => Promise.resolve(game)) } as unknown as GameRepository;
  const handler = new ResolveCriticalAlertHandler(repository, games, new HazardAttackService(attackTable, criticalTable));
  const roll = (alertId: string, value: number, criticalType?: string) =>
    handler.execute(new ResolveCriticalAlertCommand(actor.id, alertId, value, criticalType, 'user-1', []));
  return { roll, lookups };
};

describe('Critical alerts rolled by the game master (workspace spec 077, decision D3)', () => {
  it('a fumble critical takes the criticalType sent, applies its hits and effects with a fumble source and closes the alert', async () => {
    const actor = load({ hp: [50, 50] });
    actor.addFumbleCriticalAlert('B', 'mainHand');
    const alert = actor.alerts[0];
    const critical = new CriticalResult('Hit yourself.', 6, 'arm', [new CriticalEffect('stunned', 1, -25, undefined, undefined)]);
    const { roll, lookups } = setup(actor, critical);
    const result = await roll(alert.id, 42, 's');
    expect(lookups[0]).toMatchObject({ criticalType: 'S', criticalSeverity: 'B', roll: 42 });
    expect(result.hp.current).toBe(44);
    expect(result.hpLog).toContainEqual(expect.objectContaining({ kind: 'critical', amount: -6, criticalKey: 'S-B-42', phase: 3 }));
    expect(result.effects.find(effect => effect.status === 'stunned')?.source?.kind).toBe('fumble');
    expect(result.alerts[0].status).toBe('resolved');
    expect(result.alerts[0].getModifierValue('roll')).toBe(42);
    expect(result.lastCriticalRoll).toMatchObject({ origin: 'fumble', criticalType: 'S', damage: 6, text: 'Hit yourself.' });
  });

  it('a fumble critical without criticalType is rejected', async () => {
    const actor = load();
    actor.addFumbleCriticalAlert('A');
    await expect(setup(actor).roll(actor.alerts[0].id, 10)).rejects.toMatchObject({ code: 'validation' });
  });

  it('a movement critical rolls on Unbalancing (U) with a critical source', async () => {
    const actor = load();
    actor.alerts.push(ActorRoundAlert.buildCritical('U', 'A'));
    const { roll, lookups } = setup(actor);
    const result = await roll(actor.alerts[0].id, 77);
    expect(lookups[0]).toMatchObject({ criticalType: 'U', criticalSeverity: 'A' });
    expect(result.injuries).toHaveLength(0);
    expect(result.hp.current).toBe(47);
  });

  it('a heat critical keeps the location of the injury', async () => {
    const actor = load();
    actor.addHeatCriticalAlert('A', 'arms');
    const { roll, lookups } = setup(actor);
    await roll(actor.alerts[0].id, 30);
    expect(lookups[0]).toMatchObject({ criticalType: 'H', location: 'arms' });
  });

  it('a hazard critical fills its entry in the hazard', async () => {
    const actor = load();
    const alert = ActorRoundAlert.buildHazardCritical('I', 'C', 'hazard-1');
    actor.alerts.push(alert);
    actor.hazards.push({
      id: 'hazard-1',
      criticals: [{ criticalType: 'I', criticalSeverity: 'C', roll: null, damage: null, text: null, location: null, alertId: alert.id }],
    } as never);
    const result = await setup(actor).roll(alert.id, 55);
    expect(result.hazards[0].criticals[0]).toMatchObject({ roll: 55, damage: 3, text: 'Twisted ankle.', location: 'leg' });
    expect(result.hpLog[0]).toMatchObject({ kind: 'critical', criticalKey: 'I-C-55' });
  });

  it('only pending critical alerts are rolled (err-alert-not-resolvable)', async () => {
    const actor = load();
    actor.alerts.push(ActorRoundAlert.buildEndurance());
    actor.alerts.push(ActorRoundAlert.buildCritical('U', 'A'));
    actor.alerts[1].status = 'resolved';
    const { roll } = setup(actor);
    await expect(roll(actor.alerts[0].id, 10)).rejects.toMatchObject({ code: 'err-alert-not-resolvable' });
    await expect(roll(actor.alerts[1].id, 10)).rejects.toMatchObject({ code: 'err-alert-not-resolvable' });
    await expect(roll('missing', 10)).rejects.toMatchObject({ code: 'not-found' });
  });
});
