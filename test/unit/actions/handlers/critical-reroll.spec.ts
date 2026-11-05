import { randomUUID } from 'crypto';
import { describe, expect, it, vi } from 'vitest';
import { UpdateCriticalRollCommand } from '../../../../src/modules/actions/application/cqrs/commands/update-critical-roll.command.js';
import { UpdateCriticalRollHandler } from '../../../../src/modules/actions/application/cqrs/handlers/update-critical-roll.handler.js';
import type { ActionRepository } from '../../../../src/modules/actions/application/ports/action-repository.port.js';
import {
  COMBAT_PLUGIN_LIST,
  CombatPluginRegistryService,
  CombatProcessor,
} from '../../../../src/modules/actions/application/services/combat/index.js';
import { findCriticalReroll } from '../../../../src/modules/actions/domain/services/critical-reroll.js';
import { ActionAttackCalculated } from '../../../../src/modules/actions/domain/value-objects/action-attack-calculated.vo.js';
import { ActionAttackRoll } from '../../../../src/modules/actions/domain/value-objects/action-attack-roll.vo.js';
import { ActionAttackResult, AttackTableEntry } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { CriticalResult } from '../../../../src/modules/actions/domain/value-objects/critical-result.vo.js';
import { Critical } from '../../../../src/modules/actions/domain/value-objects/critical.vo.js';
import type { ActorRoundRepository } from '../../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import type { ActorRound } from '../../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundEffect } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game-repository.port.js';
import { load } from '../../actor-rounds/actor-round-test.factory.js';
import { createCombatPluginContext } from '../combat/combat-plugin-test.factory.js';
import { fakeCriticalLocationPort } from '../../../fixtures/critical-locations.js';

// Workspace spec 076, decision B8 (plan §2.5). Invented data only.

const reroll = (targetActorId: string, kind: 'offense' | 'defense') =>
  new ActorRoundEffect(
    randomUUID(),
    'critical-reroll',
    undefined,
    undefined,
    1,
    undefined,
    undefined,
    targetActorId,
    undefined,
    undefined,
    undefined,
    {
      kind,
    },
  );

const actorRound = (actorId: string, effects: ActorRoundEffect[] = []): ActorRound => Object.assign(load({ effects }), { actorId });

const setup = (source: ActorRound, target: ActorRound) => {
  const ctx = createCombatPluginContext();
  const attack = ctx.attack!;
  attack.calculated = new ActionAttackCalculated([], 120, 'arms', undefined, []);
  attack.roll = new ActionAttackRoll(90, new Map([['s_c_1', undefined]]), undefined);
  attack.results = new ActionAttackResult(
    new AttackTableEntry('12CS', 12, 'S', 'C'),
    [new Critical('s_c_1', 'pending_roll', 'S', 'C', undefined, undefined)],
    undefined,
  );
  attack.status = 'pending_critical_roll';
  ctx.action.status = 'pending_roll';
  const actors = [source, target];
  const actorRoundUpdate = vi.fn(() => Promise.resolve());
  const lookup = vi.fn(() => Promise.resolve(new CriticalResult('Hit.', 4, 'arm', [])));
  const handler = new UpdateCriticalRollHandler(
    { findById: vi.fn(() => Promise.resolve({ id: 'game-1', round: 1, checkNotFinished: () => undefined })) } as unknown as GameRepository,
    {
      findById: vi.fn(() => Promise.resolve(ctx.action)),
      update: vi.fn((updated: unknown) => Promise.resolve(updated)),
    } as unknown as ActionRepository,
    { lookup },
    { publish: vi.fn(() => Promise.resolve()) },
    new CombatProcessor(new CombatPluginRegistryService(COMBAT_PLUGIN_LIST)),
    {
      findByActorIdAndRound: vi.fn((_gameId: string, actorId: string) => Promise.resolve(actors.find(actor => actor.actorId === actorId))),
      update: actorRoundUpdate,
    } as unknown as ActorRoundRepository,
    fakeCriticalLocationPort(),
  );
  const execute = (roll: number, rerolled = false) =>
    handler.execute(new UpdateCriticalRollCommand('action-1', 'Longsword', 's_c_1', roll, 'user', [], undefined, rerolled));
  return { ctx, execute, actorRoundUpdate };
};

describe('Critical reroll (spec 076, decision B8)', () => {
  it('finds the offense reroll of the attacker first, then the defense one of the target', () => {
    const attacker = actorRound('attacker-1', [reroll('defender-1', 'offense')]);
    const defender = actorRound('defender-1', [reroll('attacker-1', 'defense')]);
    expect(findCriticalReroll(attacker, defender)).toMatchObject({ kind: 'offense', holder: attacker });
    expect(findCriticalReroll(actorRound('attacker-1'), defender)).toMatchObject({ kind: 'defense', holder: defender });
    // Against another foe, or of the other kind, it does not count
    expect(findCriticalReroll(actorRound('attacker-1', [reroll('someone', 'offense')]), actorRound('defender-1'))).toBeUndefined();
    expect(findCriticalReroll(actorRound('attacker-1', [reroll('defender-1', 'defense')]), actorRound('defender-1'))).toBeUndefined();
  });

  it('rolls again with the effect: the new roll counts, the first is kept and the effect is used up', async () => {
    const attacker = actorRound('attacker-1', [reroll('defender-1', 'offense')]);
    const { ctx, execute, actorRoundUpdate } = setup(attacker, actorRound('defender-1'));
    await execute(30);
    const updated = await execute(80, true);

    const critical = updated.attacks![0].results!.criticals![0];
    expect(critical).toMatchObject({ originalRoll: 30, rerolledBy: 'offense', status: 'completed' });
    expect(ctx.attack!.roll!.criticalRolls!.get('s_c_1')).toBe(80);
    expect(attacker.effects.some(e => e.status === 'critical-reroll')).toBe(false);
    expect(actorRoundUpdate).toHaveBeenCalledWith(attacker);
  });

  it('rejects a reroll without the effect, before the first roll, and a second one', async () => {
    const without = setup(actorRound('attacker-1'), actorRound('defender-1'));
    await without.execute(30);
    await expect(without.execute(80, true)).rejects.toMatchObject({ code: 'err-reroll-not-available' });

    const defender = actorRound('defender-1', [reroll('attacker-1', 'defense'), reroll('attacker-1', 'defense')]);
    const twice = setup(actorRound('attacker-1'), defender);
    await expect(twice.execute(30, true)).rejects.toMatchObject({ code: 'err-reroll-not-available', details: { reason: 'not-rolled' } });
    await twice.execute(30);
    await twice.execute(60, true);
    await expect(twice.execute(90, true)).rejects.toMatchObject({ details: { reason: 'already-rerolled' } });
  });

  it('cannot roll again once the attack is applied', async () => {
    const { ctx, execute } = setup(actorRound('attacker-1', [reroll('defender-1', 'offense')]), actorRound('defender-1'));
    await execute(30);
    ctx.action.status = 'completed';
    await expect(execute(80, true)).rejects.toMatchObject({ code: 'err-attack-completed' });
  });
});
