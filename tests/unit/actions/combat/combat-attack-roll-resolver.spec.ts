import { describe, expect, it, jest } from '@jest/globals';
import { ActorRoundAttack } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-attack.vo';
import type { AttackTablePort } from '../../../../src/modules/actions/application/ports/attack-table.port';
import { CombatAttackRollResolverService } from '../../../../src/modules/actions/application/services/combat';
import type { CombatContext } from '../../../../src/modules/actions/application/services/combat/combat-context';
import type { CombatProcessor } from '../../../../src/modules/actions/application/services/combat/engine/combat-processor.service';
import { ActionAttackCalculated } from '../../../../src/modules/actions/domain/value-objects/action-attack-calculated.vo';
import { createCombatPluginContext } from './combat-plugin-test.factory';

describe('CombatAttackRollResolverService', () => {
  it('marks fumble rolls as pending without looking up the attack table', async () => {
    const ctx = createCombatPluginContext();
    ctx.attack!.calculated = new ActionAttackCalculated([], 0, undefined, false);
    ctx.sourceActor!.attacks = [
      new ActorRoundAttack('Longsword', [], 75, 75, 'melee', 'slash', 'melee', 1, 5, false, null, null),
    ];

    const combatProcessor = {
      runPhase: jest.fn(async (_phase: string, context: CombatContext) => context),
    } as unknown as CombatProcessor;
    const attackTablePort = {
      lookup: jest.fn(),
    } as unknown as AttackTablePort;
    const resolver = new CombatAttackRollResolverService(combatProcessor, attackTablePort);

    await resolver.resolve({
      action: ctx.action,
      attack: ctx.attack!,
      sourceActor: ctx.sourceActor!,
      targetActor: ctx.targetActor!,
      roll: 5,
      locationRoll: undefined,
    });

    expect(attackTablePort.lookup).not.toHaveBeenCalled();
    expect(ctx.attack!.roll?.roll).toBe(5);
    expect(ctx.attack!.results?.attackTableEntry).toBeUndefined();
    expect(ctx.attack!.results?.fumble?.status).toBe('pending_roll');
    expect(ctx.attack!.status).toBe('pending_fumble_roll');
    expect(ctx.action.status).toBe('pending_roll');
  });
});
