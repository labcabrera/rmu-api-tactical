import { describe, expect, it, jest } from '@jest/globals';
import {
  PrepareAttackCommand,
  PrepareAttackCommandModifiers,
} from '../../../../src/modules/actions/application/cqrs/commands/prepare-attack.command';
import { PrepareAttackHandler } from '../../../../src/modules/actions/application/cqrs/handlers/prepare-attack.handler';
import type { ActionEventBusPort } from '../../../../src/modules/actions/application/ports/action-event-bus.port';
import type { ActionRepository } from '../../../../src/modules/actions/application/ports/action.repository';
import {
  COMBAT_PLUGIN_LIST,
  CombatPluginRegistryService,
  CombatProcessor,
} from '../../../../src/modules/actions/application/services/combat';
import type { Action } from '../../../../src/modules/actions/domain/aggregates/action.aggregate';
import type { ActorRoundRepository } from '../../../../src/modules/actor-rounds/application/ports/actor-round.repository';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game.repository';
import type { CharacterPort } from '../../../../src/modules/strategic/application/ports/character.port';
import type { StrategicGameApiClient } from '../../../../src/modules/strategic/infrastructure/api-clients/api.strategic-game.adapter';
import { createCombatPluginContext, CombatPluginContextOptions } from '../combat/combat-plugin-test.factory';

const setup = (options: CombatPluginContextOptions = {}) => {
  const ctx = createCombatPluginContext(options);
  const action = ctx.action;
  const actionRepository = {
    findById: jest.fn(() => Promise.resolve(action)),
    findByRsql: jest.fn(() => Promise.resolve({ content: [] })),
    update: jest.fn((_id: string, updated: Action) => Promise.resolve(updated)),
  } as unknown as ActionRepository;
  const game = { id: 'game-1', round: 1, strategicGameId: 'sg-1', checkValidActionManagement: () => undefined, getActionPhase: () => 3 };
  const gameRepository = { findById: jest.fn(() => Promise.resolve(game)) } as unknown as GameRepository;
  const actorRoundRepository = {
    findByGameAndRoundAndActors: jest.fn(() => Promise.resolve(ctx.actors)),
  } as unknown as ActorRoundRepository;
  const characterClient = {
    findById: jest.fn(() =>
      Promise.resolve({
        skills: [
          { skillId: 'restricted-quarters', totalBonus: 20 },
          { skillId: 'climbing', totalBonus: 40 },
        ],
        traits: [],
      }),
    ),
  } as unknown as CharacterPort;
  const strategicGameClient = {
    findById: jest.fn(() => Promise.resolve({ options: { lethality: 5 } })),
  } as unknown as StrategicGameApiClient;
  const actionEventBus = { publish: jest.fn(() => Promise.resolve()) } as unknown as ActionEventBusPort;
  const handler = new PrepareAttackHandler(
    gameRepository,
    actorRoundRepository,
    actionRepository,
    characterClient,
    strategicGameClient,
    actionEventBus,
    new CombatProcessor(new CombatPluginRegistryService(COMBAT_PLUGIN_LIST)),
  );
  const execute = (modifiers: Partial<PrepareAttackCommandModifiers>) =>
    handler.execute(
      new PrepareAttackCommand(
        'action-1',
        [
          {
            attackName: 'Longsword',
            modifiers: { targetId: 'defender-1', bo: 60, ...modifiers } as PrepareAttackCommandModifiers,
            protectors: null,
          },
        ],
        'user',
        [],
      ),
    );
  return { ctx, execute };
};

describe('PrepareAttackHandler', () => {
  it('builds every modifier with the plugins, each with its group and source', async () => {
    const { execute } = setup();

    const action = await execute({ restrictedQuarters: 'cramped', proneTarget: true, customBonus: 5 });

    const calculated = action.attacks![0].calculated!;
    expect(calculated.rollModifiers.map(modifier => [modifier.key, modifier.value, modifier.group, modifier.source])).toEqual([
      ['bo', 60, 'offense', 'offensive-bonus'],
      ['action-points', -25, 'offense', 'action-points'],
      ['bd', -25, 'defense', 'defensive-bonus'],
      ['restricted-quarters', -50, 'situation', 'restricted-quarters'],
      ['restricted-quarters-skill', 20, 'situation', 'restricted-quarters'],
      ['prone-target', 30, 'defense', 'prone-target'],
      ['game-lethality', 5, 'situation', 'game-lethality'],
      ['custom-bonus', 5, 'situation', 'custom-bonus'],
    ]);
    expect(calculated.rollTotal).toBe(20);
    expect(calculated.criticalModifiers).toEqual([]);
    expect(action.attacks![0].status).toBe('pending_attack_roll');
    expect(action.status).toBe('pending_roll');
  });

  it('adds the charge speed to the attacker size, accepting `spring` for `sprint`', async () => {
    const { execute } = setup();

    const action = await execute({ chargeSpeed: 'spring' as never, disabledDB: true });

    const attack = action.attacks![0];
    expect(attack.modifiers.chargeSpeed).toBe('sprint');
    expect(attack.calculated!.rollModifiers.find(modifier => modifier.key === 'size-difference')?.value).toBe(-10);
    expect(attack.calculated!.rollModifiers.find(modifier => modifier.key === 'bd')).toBeUndefined();
    expect(attack.calculated!.criticalModifiers).toEqual([]);
    expect(attack.calculated!.criticalAdjustment).toBeUndefined();
  });
});
