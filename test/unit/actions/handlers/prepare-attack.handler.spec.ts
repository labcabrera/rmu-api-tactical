import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import {
  PrepareAttackCommand,
  PrepareAttackCommandModifiers,
} from '../../../../src/modules/actions/application/cqrs/commands/prepare-attack.command.js';
import { PrepareAttackHandler } from '../../../../src/modules/actions/application/cqrs/handlers/prepare-attack.handler.js';
import type { DomainEventPublisher } from '../../../../src/modules/shared/application/ports/domain-event-publisher.port.js';
import type { ActionRepository } from '../../../../src/modules/actions/application/ports/action-repository.port.js';
import {
  COMBAT_PLUGIN_LIST,
  CombatPluginRegistryService,
  CombatProcessor,
} from '../../../../src/modules/actions/application/services/combat/index.js';
import type { Action } from '../../../../src/modules/actions/domain/aggregates/action.js';
import type { ActorRoundRepository } from '../../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game-repository.port.js';
import type { CharacterPort } from '../../../../src/modules/strategic/application/ports/character.port.js';
import type { StrategicGameApiClient } from '../../../../src/modules/strategic/infrastructure/api-clients/api.strategic-game.adapter.js';
import { createCombatPluginContext, type CombatPluginContextOptions } from '../combat/combat-plugin-test.factory.js';
import { ActorRoundAttack } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-attack.vo.js';
import { ActorRoundDefenseMode } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-defense-mode.vo.js';
import { ActorRoundEffect } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { ActorRoundShield } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-shield.vo.js';
import { sheetsOf } from '../../support/actor-sheets.js';

const SOURCE_SKILLS = [
  { skillId: 'restricted-quarters', totalBonus: 20 },
  { skillId: 'climbing', totalBonus: 40 },
];

const setup = (
  options: CombatPluginContextOptions = {},
  targetSkills: Array<{ skillId: string; totalBonus: number; ranks?: number }> = [],
) => {
  const ctx = createCombatPluginContext(options);
  const action = ctx.action;
  const actionRepository = {
    findById: vi.fn(() => Promise.resolve(action)),
    findByRsql: vi.fn(() => Promise.resolve({ content: [] })),
    update: vi.fn((updated: Action) => Promise.resolve(updated)),
  } as unknown as ActionRepository;
  const game = { id: 'game-1', round: 1, strategicGameId: 'sg-1', checkValidActionManagement: () => undefined, getActionPhase: () => 3 };
  const gameRepository = { findById: vi.fn(() => Promise.resolve(game)) } as unknown as GameRepository;
  const actorRoundRepository = {
    findByGameAndRoundAndActors: vi.fn(() => Promise.resolve(ctx.actors)),
  } as unknown as ActorRoundRepository;
  const characterClient = {
    findById: vi.fn((id: string) =>
      Promise.resolve({ skills: id === ctx.sourceActor!.actorId ? SOURCE_SKILLS : targetSkills, traits: [] }),
    ),
  } as unknown as CharacterPort;
  const strategicGameClient = {
    findById: vi.fn(() => Promise.resolve({ options: { letality: 5 } })),
  } as unknown as StrategicGameApiClient;
  const actionEventBus = { publish: vi.fn(() => Promise.resolve()) } as unknown as DomainEventPublisher;
  const handler = new PrepareAttackHandler(
    gameRepository,
    actorRoundRepository,
    actionRepository,
    sheetsOf(characterClient),
    strategicGameClient,
    actionEventBus,
    new CombatProcessor(new CombatPluginRegistryService(COMBAT_PLUGIN_LIST)),
  );
  const execute = (modifiers: Partial<PrepareAttackCommandModifiers>, attackNames = ['Longsword']) =>
    handler.execute(
      new PrepareAttackCommand(
        'action-1',
        attackNames.map(attackName => ({
          attackName,
          modifiers: { targetId: 'defender-1', bo: 60, ...modifiers } as PrepareAttackCommandModifiers,
          protectors: null,
        })),
        'user',
        [],
      ),
    );
  return { ctx, execute, actionRepository };
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

  it('rejects an attack whose item broke in the game (spec 019)', async () => {
    const { ctx, execute } = setup();
    ctx.sourceActor!.attacks.find(attack => attack.attackName === 'Longsword')!.broken = true;
    await expect(execute({})).rejects.toMatchObject({ code: 'err-attack-item-broken' });
  });

  it('rejects a weapon attack of a disarmed actor (workspace spec 034)', async () => {
    const { ctx, execute } = setup();
    ctx.sourceActor!.effects.push(new ActorRoundEffect('disarmed-1', 'disarmed', undefined, undefined));
    await expect(execute({})).rejects.toMatchObject({ code: 'err-attack-disarmed' });
  });

  it('takes the attack penalties and the blindness of the attacker into the roll (workspace spec 034)', async () => {
    const { ctx, execute } = setup();
    ctx.sourceActor!.effects.push(
      new ActorRoundEffect('penalty-1', 'attack_penalty', -25, 2),
      new ActorRoundEffect('blinded-1', 'blinded', undefined, undefined),
    );

    const action = await execute({});

    const modifiers = action.attacks![0].calculated!.rollModifiers.map(modifier => [modifier.key, modifier.value]);
    expect(modifiers).toEqual(
      expect.arrayContaining([
        ['attack-penalty', -25],
        ['blinded', -100],
      ]),
    );
  });

  it('accepts `spring` for `sprint`; the charge does not change the DB by size (§9.4)', async () => {
    const { execute } = setup();

    const action = await execute({ chargeSpeed: 'spring' as never, disabledDB: true });

    const attack = action.attacks![0];
    expect(attack.modifiers.chargeSpeed).toBe('sprint');
    expect(attack.calculated!.rollModifiers.find(modifier => modifier.key === 'size-difference')).toBeUndefined();
    expect(attack.calculated!.rollModifiers.find(modifier => modifier.key === 'bd')).toBeUndefined();
    expect(attack.calculated!.criticalModifiers).toEqual([]);
    expect(attack.calculated!.criticalAdjustment).toBeUndefined();
  });

  const values = (action: Action, index = 0) =>
    Object.fromEntries(action.attacks![index].calculated!.rollModifiers.map(modifier => [modifier.key, modifier.value]));

  it("reads the target's dodge from its defence mode and its Running skill from its sheet", async () => {
    const { execute } = setup({ defenseMode: ActorRoundDefenseMode.of('full', 'none') }, [
      { skillId: 'running', totalBonus: 40, ranks: 8 },
    ]);

    const action = await execute({});

    expect(values(action).dodge).toBe(-40);
  });

  it('covers only the first of two attacks with a one-block shield', async () => {
    const { ctx, execute } = setup({ shield: new ActorRoundShield(20, 1, 0) });
    ctx.sourceActor!.attacks.push(
      Object.assign(new ActorRoundAttack('', [], 0, 0, 'melee', '', '', 0, 0, false, null, null), ctx.sourceAttack, {
        attackName: 'offHand',
      }),
    );

    const action = await execute({}, ['Longsword', 'offHand']);

    expect(values(action, 0).shield).toBe(-20);
    expect(values(action, 1).shield).toBeUndefined();
  });

  it('applies the flatfooted target from its effects and the two-handed weapon from the sheet', async () => {
    const { ctx, execute } = setup({ twoHanded: true, shield: new ActorRoundShield(20, 1, 0) });
    ctx.targetActor!.effects.push({ id: 'e-1', status: 'flatfooted', value: undefined, rounds: 1 });

    const action = await execute({});

    expect(values(action)).toEqual({
      bo: 60,
      'two-handed-weapon': 10,
      'action-points': -25,
      'flatfooted-target': 25,
      'flatfooted-rear': 35,
      'game-lethality': 5,
    });
    expect(action.attacks![0].calculated!.location).toBeUndefined();
  });

  it('offers a parry only to a target whose last action is a melee attack', async () => {
    const { ctx, actionRepository, execute } = setup();
    ctx.targetActor!.attacks = [
      new ActorRoundAttack('mainHand', [], 50, 50, 'melee', 'arming-sword', 'melee-one-hand', 0, 3, false, null, null),
    ];
    const defenderAction = {
      id: 'a-2',
      actorId: 'defender-1',
      actionType: 'melee_attack',
      phaseStart: 1,
      phaseEnd: null,
      freeAction: false,
    };
    (actionRepository.findByRsql as Mock).mockImplementation(() => Promise.resolve({ content: [defenderAction] }));

    const action = await execute({});

    expect(action.parries).toEqual([expect.objectContaining({ actorId: 'defender-1', parryType: 'parry' })]);
    expect(action.status).toBe('parry');
  });
});
