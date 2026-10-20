import { describe, expect, it, jest } from '@jest/globals';
import type { CommandBus } from '@nestjs/cqrs';
import { ApplyAttackCommand } from '../../../../src/modules/actions/application/cqrs/commands/apply-attack.command';
import { ApplyAttackHandler } from '../../../../src/modules/actions/application/cqrs/handlers/apply-attack.handler';
import type { ActionEventBusPort } from '../../../../src/modules/actions/application/ports/action-event-bus.port';
import type { ActionRepository } from '../../../../src/modules/actions/application/ports/action.repository';
import { Action } from '../../../../src/modules/actions/domain/aggregates/action.aggregate';
import { ActionParry } from '../../../../src/modules/actions/domain/value-objects/action-attack-parry.vo';
import { ActionAttack } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo';
import { KeyValueModifier } from '../../../../src/modules/actions/domain/value-objects/key-value-modifier.vo';
import { DeclareActorParryCommand } from '../../../../src/modules/actor-rounds/application/cqrs/commands/declare-actor-parry.command';
import type { ActorRoundRepository } from '../../../../src/modules/actor-rounds/application/ports/actor-round.repository';
import { ActorRoundShield } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-shield.vo';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game.repository';
import type { StrategicGameApiClient } from '../../../../src/modules/strategic/infrastructure/api-clients/api.strategic-game.adapter';
import { load } from '../../actor-rounds/actor-round-test.factory';

const appliedAttack = (attackName: string, modifiers: KeyValueModifier[]) =>
  ({
    attackName,
    type: 'melee',
    modifiers: { targetId: 'defender', bo: 0 },
    calculated: { rollModifiers: modifiers, rollTotal: 0 },
    status: 'pending_apply',
    protectors: null,
  }) as unknown as ActionAttack;

const setup = (attacks: ActionAttack[], parries: ActionParry[] = [], blocks: [number, number] = [1, 0]) => {
  const source = Object.assign(load(), { actorId: 'attacker' });
  const target = Object.assign(load({ shield: new ActorRoundShield(20, ...blocks) }), { actorId: 'defender' });
  const action = Action.fromProps({
    id: 'action-1',
    gameId: 'game-1',
    actorId: 'attacker',
    round: 1,
    actionType: 'melee_attack',
    freeAction: false,
    phaseStart: 1,
    phaseEnd: null,
    status: 'pending_apply',
    actionPoints: 4,
    movement: null,
    attacks,
    parries,
    maneuver: null,
    fatigue: null,
    description: null,
    owner: 'owner',
    createdAt: new Date(),
    updatedAt: null,
  });
  const actionRepository = {
    findById: jest.fn(() => Promise.resolve(action)),
    findByRsql: jest.fn(() => Promise.resolve({ content: [] })),
    update: jest.fn((_id: string, updated: Action) => Promise.resolve(updated)),
  } as unknown as ActionRepository;
  const update = jest.fn<(id: string, actor: unknown) => Promise<void>>(() => Promise.resolve());
  const actorRoundRepository = {
    findByRsql: jest.fn(() => Promise.resolve({ content: [source, target] })),
    findById: jest.fn((id: string) => Promise.resolve([source, target].find(actor => actor.id === id))),
    update,
  } as unknown as ActorRoundRepository;
  const gameRepository = {
    findById: jest.fn(() => Promise.resolve({ round: 1, strategicGameId: 'sg-1', getActionPhase: () => 4 })),
  } as unknown as GameRepository;
  const strategicGame = { findById: jest.fn(() => Promise.resolve({ options: {} })) } as unknown as StrategicGameApiClient;
  const execute = jest.fn((command: unknown) => Promise.resolve(command));
  const handler = new ApplyAttackHandler(
    gameRepository,
    actionRepository,
    actorRoundRepository,
    strategicGame,
    { publish: jest.fn(() => Promise.resolve()) } as unknown as ActionEventBusPort,
    { execute } as unknown as CommandBus,
  );
  const run = () => handler.execute(new ApplyAttackCommand('action-1', 'user', []));
  return { run, target, update, execute };
};

describe('ApplyAttackHandler', () => {
  it('spends a shield block for each attack the shield covered (§9.6 Shields)', async () => {
    const { run, target, update } = setup(
      [appliedAttack('mainHand', [new KeyValueModifier('shield', -20)]), appliedAttack('offHand', [new KeyValueModifier('bo', 60)])],
      [],
      [2, 0],
    );

    await run();

    expect(target.defense.shield!.currentBlocks).toBe(1);
    expect(update).toHaveBeenCalledWith(target.id, target);
  });

  it('does not spend a block the shield no longer has', async () => {
    const { run, target } = setup([appliedAttack('mainHand', [new KeyValueModifier('shield-block', -10)])], [], [1, 1]);

    await expect(run()).resolves.toBeDefined();
    expect(target.defense.shield!.currentBlocks).toBe(1);
  });

  it('does not spend again the OB of a parry carried over from an earlier action', async () => {
    const parries = [
      new ActionParry('p-1', 'defender', 'defender', 'parry', 30, 30, undefined, undefined, true),
      new ActionParry('p-2', 'helper', 'defender', 'protect', 50, 10, -25, 'other'),
    ];
    const { run, execute } = setup([appliedAttack('mainHand', [])], parries);

    await run();

    const declared = execute.mock.calls
      .map(([command]) => command)
      .filter((command): command is DeclareActorParryCommand => command instanceof DeclareActorParryCommand);
    expect(declared.map(command => [command.actorId, command.parry])).toEqual([['helper', 35]]);
  });
});
