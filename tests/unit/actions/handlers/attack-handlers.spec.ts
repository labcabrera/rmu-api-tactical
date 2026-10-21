import { ActorRoundAttack } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-attack.vo';
import { ActorRoundPenalty } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-penalty.vo';
import { ActorRoundPenaltyModifier } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-penalty-modifier.vo';
import { describe, expect, it, jest } from '@jest/globals';
import { ActionAttackCalculated } from '../../../../src/modules/actions/domain/value-objects/action-attack-calculated.vo';
import { ActionAttackRoll } from '../../../../src/modules/actions/domain/value-objects/action-attack-roll.vo';
import { ActionAttackResult, AttackTableEntry, Fumble } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo';
import { ActionParry } from '../../../../src/modules/actions/domain/value-objects/action-attack-parry.vo';
import { Critical } from '../../../../src/modules/actions/domain/value-objects/critical.vo';
import { CriticalResult } from '../../../../src/modules/actions/domain/value-objects/critical-result.vo';
import { KeyValueModifier } from '../../../../src/modules/actions/domain/value-objects/key-value-modifier.vo';
import type { Action } from '../../../../src/modules/actions/domain/aggregates/action.aggregate';
import type { ActionEventBusPort } from '../../../../src/modules/actions/application/ports/action-event-bus.port';
import type { ActionRepository } from '../../../../src/modules/actions/application/ports/action.repository';
import type { CriticalTableLookupRequest, CriticalTablePort } from '../../../../src/modules/actions/application/ports/critical-table.port';
import type { FumbleTableLookupRequest, FumbleTablePort } from '../../../../src/modules/actions/application/ports/fumble-table.port';
import type { ActorRoundRepository } from '../../../../src/modules/actor-rounds/application/ports/actor-round.repository';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game.repository';
import {
  COMBAT_PLUGIN_LIST,
  CombatAttackRollResolverService,
  CombatPluginRegistryService,
  CombatProcessor,
} from '../../../../src/modules/actions/application/services/combat';
import { UpdateCriticalRollHandler } from '../../../../src/modules/actions/application/cqrs/handlers/update-critical-roll.handler';
import { UpdateFumbleRollHandler } from '../../../../src/modules/actions/application/cqrs/handlers/update-fumble-roll.handler';
import { DeclareParryHandler } from '../../../../src/modules/actions/application/cqrs/handlers/declare-parry.handler';
import { UpdateAttackRollHandler } from '../../../../src/modules/actions/application/cqrs/handlers/update-attack-roll.handler';
import { UpdateCriticalRollCommand } from '../../../../src/modules/actions/application/cqrs/commands/update-critical-roll.command';
import { UpdateFumbleRollCommand } from '../../../../src/modules/actions/application/cqrs/commands/update-fumble-roll.command';
import { DeclareParryCommand, DeclareParryItem } from '../../../../src/modules/actions/application/cqrs/commands/declare-parry.command';
import { UpdateAttackRollCommand } from '../../../../src/modules/actions/application/cqrs/commands/update-attack-roll.command';
import type { AttackTablePort } from '../../../../src/modules/actions/application/ports/attack-table.port';
import { createCombatPluginContext } from '../combat/combat-plugin-test.factory';

const processor = () => new CombatProcessor(new CombatPluginRegistryService(COMBAT_PLUGIN_LIST));

const repositories = (action: Action, actors = createCombatPluginContext().actors!) => {
  const actionRepository = {
    findById: jest.fn(() => Promise.resolve(action)),
    update: jest.fn((_id: string, updated: Action) => Promise.resolve(updated)),
  } as unknown as ActionRepository;
  const gameRepository = {
    findById: jest.fn(() => Promise.resolve({ id: 'game-1', round: 1, checkNotFinished: () => undefined })),
  } as unknown as GameRepository;
  const actorRoundUpdate = jest.fn(() => Promise.resolve());
  const actorRoundRepository = {
    findByActorIdAndRound: jest.fn((_gameId: string, actorId: string) => Promise.resolve(actors.find(actor => actor.actorId === actorId))),
    findByRsql: jest.fn(() => Promise.resolve({ content: actors })),
    update: actorRoundUpdate,
  } as unknown as ActorRoundRepository;
  const actionEventBus = { publish: jest.fn(() => Promise.resolve()) } as unknown as ActionEventBusPort;
  return { actionRepository, gameRepository, actorRoundRepository, actorRoundUpdate, actionEventBus };
};

/** An attack already rolled, with the criticals given and, optionally, a fumble. */
const rolledContext = (criticals: Critical[], fumble?: Fumble) => {
  const ctx = createCombatPluginContext();
  const attack = ctx.attack!;
  attack.calculated = new ActionAttackCalculated([new KeyValueModifier('bo', 75)], 120, 'arms', undefined, [
    new KeyValueModifier('size-difference', 1, 'situation', 'size-difference'),
    new KeyValueModifier('absolute-hit', 2, 'resolution', 'absolute-hit'),
  ]);
  attack.roll = new ActionAttackRoll(45, new Map(criticals.map(critical => [critical.key, undefined])), undefined);
  attack.results = new ActionAttackResult(new AttackTableEntry('20FS', 20, 'S', 'F'), criticals, fumble);
  attack.status = fumble ? 'pending_fumble_roll' : 'pending_critical_roll';
  ctx.action.status = 'pending_roll';
  return ctx;
};

const pendingCritical = (key: string, severity: string) => new Critical(key, 'pending_roll', 'S', severity, undefined, undefined);

describe('UpdateCriticalRollHandler', () => {
  const setup = (criticals: Critical[]) => {
    const ctx = rolledContext(criticals);
    const repos = repositories(ctx.action);
    const lookup = jest.fn((request: CriticalTableLookupRequest) => {
      void request;
      return Promise.resolve(new CriticalResult('Hit.', 4, 'arm', []));
    });
    const handler = new UpdateCriticalRollHandler(
      repos.gameRepository,
      repos.actionRepository,
      { lookup } as CriticalTablePort,
      repos.actionEventBus,
      processor(),
      repos.actorRoundRepository,
    );
    const execute = (key: string, roll: number) =>
      handler.execute(new UpdateCriticalRollCommand('action-1', 'Longsword', key, roll, 'user', []));
    return { ctx, lookup, execute };
  };

  it('stores the raw roll and looks up the roll adjusted by the critical modifiers, at the location hit', async () => {
    const { ctx, lookup, execute } = setup([pendingCritical('s_c_1', 'C')]);

    await execute('s_c_1', 50);

    const attack = ctx.attack!;
    expect(lookup).toHaveBeenCalledWith({ criticalType: 'S', criticalSeverity: 'C', roll: 53, location: 'arms' });
    expect(attack.roll!.criticalRolls!.get('s_c_1')).toBe(50);
    expect(attack.results!.criticals![0]).toMatchObject({ adjustedRoll: 53, status: 'completed', result: { damage: 4 } });
  });

  it('resolves every critical of the attack with the first roll and the same location (§9.8)', async () => {
    const { ctx, lookup, execute } = setup([pendingCritical('s_e_1', 'E'), pendingCritical('s_a_2', 'A')]);
    ctx.attack!.calculated!.location = undefined;

    await execute('s_e_1', 50);

    const attack = ctx.attack!;
    expect(lookup.mock.calls.map(([request]) => request)).toEqual([
      { criticalType: 'S', criticalSeverity: 'E', roll: 53, location: undefined },
      // The first result hit an arm: the second critical hits it too.
      { criticalType: 'S', criticalSeverity: 'A', roll: 53, location: 'arms' },
    ]);
    expect(Array.from(attack.roll!.criticalRolls!.entries())).toEqual([
      ['s_e_1', 50],
      ['s_a_2', 50],
    ]);
    expect(attack.results!.criticals!.map(critical => critical.status)).toEqual(['completed', 'completed']);
    expect(attack.status).toBe('pending_apply');
  });

  it('accepts the shared roll again and rejects a different one for another critical', async () => {
    const { execute } = setup([pendingCritical('s_e_1', 'E'), pendingCritical('s_a_2', 'A')]);
    await execute('s_e_1', 50);

    await expect(execute('s_a_2', 50)).resolves.toBeDefined();
    await expect(execute('s_a_2', 70)).rejects.toMatchObject({ errorCode: 'err-critical-roll-mismatch' });
  });

  it('clamps the adjusted roll to 1..100 and moves the attack to pending_apply after the last critical', async () => {
    const { ctx, lookup, execute } = setup([pendingCritical('s_c_1', 'C')]);

    await execute('s_c_1', 99);

    expect(lookup).toHaveBeenCalledWith(expect.objectContaining({ roll: 100 }));
    expect(ctx.attack!.status).toBe('pending_apply');
    expect(ctx.action.status).toBe('pending_apply');
  });

  it('accepts the critical rolls stored as a plain object', async () => {
    const { ctx, execute } = setup([pendingCritical('s_c_1', 'C')]);
    ctx.attack!.roll!.criticalRolls = { s_c_1: undefined } as unknown as Map<string, number | undefined>;

    await execute('s_c_1', 40);

    expect(ctx.attack!.roll!.criticalRolls.get('s_c_1')).toBe(40);
  });

  it('keeps another attack of the action pending', async () => {
    const { ctx, execute } = setup([pendingCritical('s_c_1', 'C')]);
    const other = rolledContext([pendingCritical('s_b_1', 'B')]).attack!;
    other.attackName = 'offHand';
    ctx.action.attacks!.push(other);

    await execute('s_c_1', 40);

    expect(ctx.attack!.status).toBe('pending_apply');
    expect(other.status).toBe('pending_critical_roll');
    expect(ctx.action.status).toBe('pending_roll');
  });

  it('rejects an unknown critical', async () => {
    const { execute } = setup([pendingCritical('s_c_1', 'C')]);

    await expect(execute('s_d_1', 40)).rejects.toThrow('Critical s_d_1 not found');
  });
});

describe('UpdateFumbleRollHandler', () => {
  it('stores the raw roll, looks up the fumble table of the attack and moves the attack to pending_apply', async () => {
    const ctx = rolledContext([], new Fumble('pending_roll', undefined, undefined, undefined, undefined));
    ctx.attack!.results!.attackTableEntry = undefined;
    const repos = repositories(ctx.action, ctx.actors);
    const fumble = new Fumble('completed', 'Slips.', undefined, 0, []);
    const lookup = jest.fn((request: FumbleTableLookupRequest) => {
      void request;
      return Promise.resolve(fumble);
    });
    const handler = new UpdateFumbleRollHandler(
      repos.gameRepository,
      repos.actionRepository,
      repos.actorRoundRepository,
      { lookup } as FumbleTablePort,
      repos.actionEventBus,
      processor(),
    );

    await handler.execute(new UpdateFumbleRollCommand('action-1', 'Longsword', 104, 'user', []));

    expect(lookup).toHaveBeenCalledWith({ fumbleTable: 'melee-one-hand', roll: 104 });
    expect(ctx.attack!.roll!.fumbleRoll).toBe(104);
    expect(ctx.attack!.results!.fumble).toBe(fumble);
    expect(ctx.attack!.status).toBe('pending_apply');
    expect(ctx.action.status).toBe('pending_apply');
  });
});

describe('DeclareParryHandler', () => {
  it('runs the parry phase on each attack and recomputes the total', async () => {
    const ctx = createCombatPluginContext();
    ctx.attack!.calculated = new ActionAttackCalculated([new KeyValueModifier('bo', 75), new KeyValueModifier('bd', -25)], 50, undefined);
    ctx.action.parries = [new ActionParry('parry-1', 'defender-1', 'defender-1', 'parry', 40, 0)];
    ctx.action.status = 'parry';
    const repos = repositories(ctx.action, ctx.actors);
    const handler = new DeclareParryHandler(
      repos.gameRepository,
      repos.actorRoundRepository,
      repos.actionRepository,
      repos.actionEventBus,
      processor(),
    );

    await handler.execute(new DeclareParryCommand('action-1', [new DeclareParryItem('parry-1', 30)], 'user', []));

    expect(ctx.attack!.calculated.rollModifiers.map(modifier => [modifier.key, modifier.value, modifier.source])).toEqual([
      ['bo', 75, undefined],
      ['bd', -25, undefined],
      ['parry', -30, 'parry'],
    ]);
    expect(ctx.attack!.calculated.rollTotal).toBe(20);
    expect(ctx.action.status).toBe('pending_roll');
  });

  it('adds no parry when the attack disables it', async () => {
    const ctx = createCombatPluginContext({ modifiers: { disabledParry: true } });
    ctx.attack!.calculated = new ActionAttackCalculated([new KeyValueModifier('bo', 75)], 75, undefined);
    ctx.action.parries = [new ActionParry('parry-1', 'defender-1', 'defender-1', 'parry', 40, 0)];
    const repos = repositories(ctx.action, ctx.actors);
    const handler = new DeclareParryHandler(
      repos.gameRepository,
      repos.actorRoundRepository,
      repos.actionRepository,
      repos.actionEventBus,
      processor(),
    );

    await handler.execute(new DeclareParryCommand('action-1', [new DeclareParryItem('parry-1', 30)], 'user', []));

    expect(ctx.attack!.calculated.rollTotal).toBe(75);
  });

  it('rejects a parry above the one available', async () => {
    const ctx = createCombatPluginContext();
    ctx.attack!.calculated = new ActionAttackCalculated([new KeyValueModifier('bo', 75)], 75, undefined);
    ctx.action.parries = [new ActionParry('parry-1', 'defender-1', 'defender-1', 'parry', 5, 0)];
    ctx.action.status = 'parry';
    const repos = repositories(ctx.action, ctx.actors);
    const handler = new DeclareParryHandler(
      repos.gameRepository,
      repos.actorRoundRepository,
      repos.actionRepository,
      repos.actionEventBus,
      processor(),
    );

    await expect(handler.execute(new DeclareParryCommand('action-1', [new DeclareParryItem('parry-1', 30)], 'user', []))).rejects.toThrow(
      'Parry must be between 0 and 5',
    );
  });
});

describe('DeclareParryHandler carried over and protect parries', () => {
  const declare = (parries: ActionParry[], items: DeclareParryItem[]) => {
    const ctx = createCombatPluginContext();
    ctx.attack!.calculated = new ActionAttackCalculated([new KeyValueModifier('bo', 75)], 75, undefined);
    ctx.action.parries = parries;
    ctx.action.status = 'parry';
    const repos = repositories(ctx.action, ctx.actors);
    const handler = new DeclareParryHandler(
      repos.gameRepository,
      repos.actorRoundRepository,
      repos.actionRepository,
      repos.actionEventBus,
      processor(),
    );
    return handler.execute(new DeclareParryCommand('action-1', items, 'user', [])).then(() => ctx);
  };

  it('keeps a carried over parry whatever is declared, and counts it against the attack (§9.6)', async () => {
    const ctx = await declare(
      [new ActionParry('parry-1', 'defender-1', 'defender-1', 'parry', 30, 30, undefined, undefined, true)],
      [new DeclareParryItem('parry-1', 0)],
    );

    expect(ctx.action.parries![0].parry).toBe(30);
    expect(ctx.attack!.calculated!.rollTotal).toBe(45);
  });

  it("counts the protect penalty in the protector's OB when it protects and its own parry", async () => {
    // 100 OB: 75 available to protect at -25; protecting with 40 and parrying with 40 spends 105.
    const parries = [
      new ActionParry('parry-1', 'helper', 'helper', 'parry', 100, 0),
      new ActionParry('protect-1', 'helper', 'defender-1', 'protect', 75, 0, -25, 'other'),
    ];

    await expect(declare(parries, [new DeclareParryItem('parry-1', 40), new DeclareParryItem('protect-1', 40)])).rejects.toThrow(
      'Parries add up to 105, above the 100 available',
    );
    await expect(declare(parries, [new DeclareParryItem('parry-1', 35), new DeclareParryItem('protect-1', 40)])).resolves.toBeDefined();
  });
});

describe('DeclareParryHandler shared parry', () => {
  it('rejects parries of one actor that add up above its available parry', async () => {
    const ctx = createCombatPluginContext();
    ctx.attack!.calculated = new ActionAttackCalculated([new KeyValueModifier('bo', 75)], 75, undefined);
    ctx.action.parries = [
      new ActionParry('parry-1', 'defender-1', 'defender-1', 'parry', 10, 0),
      new ActionParry('parry-2', 'defender-1', 'defender-1', 'parry', 10, 0),
    ];
    ctx.action.status = 'parry';
    const repos = repositories(ctx.action, ctx.actors);
    const handler = new DeclareParryHandler(
      repos.gameRepository,
      repos.actorRoundRepository,
      repos.actionRepository,
      repos.actionEventBus,
      processor(),
    );

    await expect(
      handler.execute(
        new DeclareParryCommand('action-1', [new DeclareParryItem('parry-1', 6), new DeclareParryItem('parry-2', 6)], 'user', []),
      ),
    ).rejects.toThrow('Parries add up to 12, above the 10 available');
  });
});

describe('Action parry options', () => {
  it("caps the defender's parry with its penalties", () => {
    const ctx = createCombatPluginContext();
    const defender = ctx.targetActor!;
    defender.attacks = [new ActorRoundAttack('mainHand', [], 80, 80, 'melee', 'arming-sword', 'melee-one-hand', 0, 3, false, null, null)];
    defender.penalty = new ActorRoundPenalty([new ActorRoundPenaltyModifier('p1', 'hp', -50)]);
    const defenderAttack = { actorId: defender.actorId, actionType: 'melee_attack', phaseStart: 1 } as unknown as Action;

    ctx.action.processParryOptions([ctx.sourceActor!, defender], [defenderAttack], 1);

    expect(ctx.action.parries!.map(parry => [parry.actorId, parry.parryAvailable])).toEqual([[defender.actorId, 30]]);
  });
});

describe('UpdateAttackRollHandler', () => {
  const setup = () => {
    const ctx = createCombatPluginContext();
    ctx.attack!.calculated = new ActionAttackCalculated([new KeyValueModifier('bo', 75)], 75, undefined, undefined, []);
    const repos = repositories(ctx.action, ctx.actors);
    const lookup = jest.fn(() => Promise.resolve(new AttackTableEntry('9', 9, undefined, undefined)));
    const resolver = new CombatAttackRollResolverService(processor(), { lookup } as unknown as AttackTablePort);
    const handler = new UpdateAttackRollHandler(
      repos.gameRepository,
      repos.actionRepository,
      repos.actorRoundRepository,
      repos.actionEventBus,
      resolver,
    );
    const execute = (roll: number) => handler.execute(new UpdateAttackRollCommand('action-1', 'Longsword', roll, 'user', []));
    return { ctx, repos, execute };
  };

  it('raises the breakage alert on the attacker when the roll is resolved, once', async () => {
    const { ctx, repos, execute } = setup();

    await execute(77);
    await execute(77);

    expect(ctx.attack!.calculated!.breakageRoll).toBe(true);
    expect(ctx.sourceActor!.alerts).toHaveLength(1);
    expect(repos.actorRoundUpdate).toHaveBeenCalledTimes(1);
    expect(ctx.action.status).toBe('pending_apply');
  });

  it('raises no alert for other rolls', async () => {
    const { ctx, repos, execute } = setup();

    await execute(50);

    expect(ctx.sourceActor!.alerts).toHaveLength(0);
    expect(repos.actorRoundUpdate).not.toHaveBeenCalled();
  });
});
