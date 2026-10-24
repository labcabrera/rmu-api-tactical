import { describe, expect, it, vi } from 'vitest';
import type { CommandBus } from '@nestjs/cqrs';
import { CompleteActionCommand } from '../../../src/modules/actions/application/cqrs/commands/complete-action.command.js';
import { CreateActionCommand } from '../../../src/modules/actions/application/cqrs/commands/create-action.command.js';
import { ManageActionPointsCommand } from '../../../src/modules/actions/application/cqrs/commands/manage-action-points.command.js';
import {
  PrepareAttackCommand,
  PrepareAttackCommandModifiers,
} from '../../../src/modules/actions/application/cqrs/commands/prepare-attack.command.js';
import { CompleteActionHandler } from '../../../src/modules/actions/application/cqrs/handlers/complete-action.handler.js';
import { CreateActionHandler } from '../../../src/modules/actions/application/cqrs/handlers/create-action.handler.js';
import { ManageActionPointsHandler } from '../../../src/modules/actions/application/cqrs/handlers/manage-action-points.handler.js';
import { PrepareAttackHandler } from '../../../src/modules/actions/application/cqrs/handlers/prepare-attack.handler.js';
import type { ActionRepository } from '../../../src/modules/actions/application/ports/action-repository.port.js';
import { ActionApStateService } from '../../../src/modules/actions/application/services/action-ap-state.service.js';
import {
  COMBAT_PLUGIN_LIST,
  CombatPluginRegistryService,
  CombatProcessor,
} from '../../../src/modules/actions/application/services/combat/index.js';
import { Action, type ActionProps } from '../../../src/modules/actions/domain/aggregates/action.js';
import { ActionParry } from '../../../src/modules/actions/domain/value-objects/action-attack-parry.vo.js';
import { ActionResolution } from '../../../src/modules/actions/domain/value-objects/action-resolution.vo.js';
import type { ActionType } from '../../../src/modules/actions/domain/value-objects/action-type.vo.js';
import { ActionDto } from '../../../src/modules/actions/interfaces/http/dto/action.dto.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ApLedgerEntry } from '../../../src/modules/actor-rounds/domain/value-objects/ap-ledger-entry.vo.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import { Game } from '../../../src/modules/games/domain/aggregates/game.js';
import type { CharacterPort } from '../../../src/modules/strategic/application/ports/character.port.js';
import type { StrategicGameApiClient } from '../../../src/modules/strategic/infrastructure/api-clients/api.strategic-game.adapter.js';
import { effect, load } from '../actor-rounds/actor-round-test.factory.js';
import { createCombatPluginContext } from './combat/combat-plugin-test.factory.js';

/** An action declared after spec 011: its AP come only from the ledger. */
const action = (id: string, actionType: ActionType, phaseStart: number, extra: Partial<ActionProps> = {}): Action =>
  Action.fromProps({
    id,
    gameId: 'game-1',
    actorId: 'actor-1',
    round: 1,
    actionType,
    freeAction: false,
    phaseStart,
    phaseEnd: null,
    status: 'declared',
    actionPoints: null,
    movement: null,
    attacks: null,
    parries: null,
    maneuver: null,
    fatigue: null,
    description: null,
    resolution: ActionResolution.normal(),
    owner: 'owner',
    createdAt: new Date('2026-10-21T10:00:00Z'),
    updatedAt: null,
    ...extra,
  });

/** Records the AP of the phases on the action. */
const spend = (actorRound: ActorRound, actionId: string, ...phases: number[]) =>
  phases.forEach(phase => actorRound.spend(phase, actionId, 1));

/** Declares an action in the current phase as the create handler does, without repositories. */
const declare = (actorRound: ActorRound, actions: Action[], newAction: Action, currentPhase: number, roundActions = actions) => {
  const plan = Action.checkDeclaration(
    actorRound,
    actions,
    { actionType: newAction.actionType, phaseStart: newAction.phaseStart, freeAction: newAction.freeAction },
    currentPhase,
    roundActions,
  );
  newAction.applyDeclaration(actorRound, plan, currentPhase);
  return plan;
};

const readiness = (target: Action, actorRound: ActorRound, phase: number, openRounds = false) =>
  target.readiness(actorRound, phase, openRounds);

/** Prepares the attack of a combat test context with an AP ledger, in the given phase. */
const prepareAttack = async (options: { phase: number; ledger: number[]; resolution?: ActionResolution | null; freeAction?: boolean }) => {
  const ctx = createCombatPluginContext({ freeAction: options.freeAction });
  ctx.action.resolution = options.resolution === undefined ? ActionResolution.normal() : options.resolution;
  ctx.sourceActor!.apLedger = options.ledger.map(phase => new ApLedgerEntry(phase, ctx.action.id, 1, 'spent'));
  const actionRepository = {
    findById: vi.fn(() => Promise.resolve(ctx.action)),
    findByRsql: vi.fn(() => Promise.resolve({ content: [] })),
    update: vi.fn((_id: string, updated: Action) => Promise.resolve(updated)),
  } as unknown as ActionRepository;
  const game = {
    id: 'game-1',
    round: 1,
    strategicGameId: 'sg-1',
    checkValidActionManagement: () => undefined,
    getActionPhase: () => options.phase,
  };
  const handler = new PrepareAttackHandler(
    { findById: vi.fn(() => Promise.resolve(game)) } as unknown as GameRepository,
    { findByGameAndRoundAndActors: vi.fn(() => Promise.resolve(ctx.actors)) } as unknown as ActorRoundRepository,
    actionRepository,
    { findById: vi.fn(() => Promise.resolve({ skills: [], traits: [] })) } as unknown as CharacterPort,
    { findById: vi.fn(() => Promise.resolve({ options: {} })) } as unknown as StrategicGameApiClient,
    { publish: vi.fn(() => Promise.resolve()) },
    new CombatProcessor(new CombatPluginRegistryService(COMBAT_PLUGIN_LIST)),
  );
  const prepared = await handler.execute(
    new PrepareAttackCommand(
      ctx.action.id,
      [{ attackName: 'Longsword', modifiers: { targetId: 'defender-1', bo: 60 } as PrepareAttackCommandModifiers, protectors: null }],
      'user',
      [],
    ),
  );
  const modifiers = Object.fromEntries(prepared.attacks![0].calculated!.rollModifiers.map(modifier => [modifier.key, modifier.value]));
  return { prepared, modifiers };
};

describe('Action points of an action (spec 011, §2 and §4)', () => {
  it('criterion 1: a melee attack with 1 AP cannot be prepared; with 2 AP it takes -50, with 4 AP nothing', async () => {
    await expect(prepareAttack({ phase: 1, ledger: [1] })).rejects.toMatchObject({ errorCode: 'err-action-points-below-min' });

    const two = await prepareAttack({ phase: 2, ledger: [1, 2] });
    expect(two.modifiers['action-points']).toBe(-50);
    expect(two.prepared.actionPoints).toBe(2);
    expect(two.prepared.apState).toMatchObject({ readiness: 'in-resolution', actionPoints: 2 });

    const four = await prepareAttack({ phase: 4, ledger: [1, 2, 3, 4] });
    expect(four.modifiers['action-points'] ?? 0).toBe(0);
  });

  it('readiness goes from blocked to ready and optimal as the AP are spent', () => {
    const actorRound = load();
    const melee = action('melee', 'melee_attack', 1);
    declare(actorRound, [], melee, 1);

    expect(readiness(melee, actorRound, 1)).toEqual({ actionPoints: 1, readiness: 'blocked', readinessPenalty: null });
    spend(actorRound, 'melee', 2);
    expect(readiness(melee, actorRound, 2)).toEqual({ actionPoints: 2, readiness: 'ready', readinessPenalty: -50 });
    spend(actorRound, 'melee', 3);
    expect(readiness(melee, actorRound, 3)).toEqual({ actionPoints: 3, readiness: 'ready', readinessPenalty: -25 });
    spend(actorRound, 'melee', 4);
    expect(readiness(melee, actorRound, 4)).toEqual({ actionPoints: 4, readiness: 'optimal', readinessPenalty: 0 });
  });

  it('is unreachable when the round has not enough capacity left to reach the minimum', () => {
    const actorRound = load();
    const melee = action('melee', 'melee_attack', 4);
    declare(actorRound, [], melee, 4);

    expect(readiness(melee, actorRound, 4).readiness).toBe('unreachable');
    expect(() => melee.checkResolvable(actorRound, 4)).toThrow(expect.objectContaining({ errorCode: 'err-action-points-below-min' }));
    expect(readiness(melee, actorRound, 3).readiness).toBe('blocked');
  });

  it('with open rounds is blocked, not unreachable, when it only misses the minimum because the round ends', () => {
    const actorRound = load();
    const melee = action('melee', 'melee_attack', 4);
    declare(actorRound, [], melee, 4);

    expect(readiness(melee, actorRound, 4, true).readiness).toBe('blocked');
    // The default is the game default: open rounds on.
    expect(melee.readiness(actorRound, 4).readiness).toBe('blocked');
    expect(() => melee.checkResolvable(actorRound, 4)).toThrow(expect.objectContaining({ errorCode: 'err-action-points-below-min' }));
  });

  it('is unreachable, even with open rounds, when the actor cannot act any more', () => {
    const actorRound = load();
    const melee = action('melee', 'melee_attack', 1);
    declare(actorRound, [], melee, 1);
    actorRound.effects.push(effect('unconscious'));

    expect(readiness(melee, actorRound, 1, true).readiness).toBe('unreachable');
  });

  it('is in-resolution while resolving, held when held and done once over', () => {
    const actorRound = load();
    const melee = action('melee', 'melee_attack', 1);
    spend(actorRound, 'melee', 1, 2, 3, 4);

    melee.hold(actorRound, 4);
    expect(melee.status).toBe('held');
    expect(readiness(melee, actorRound, 4)).toMatchObject({ readiness: 'held', readinessPenalty: 0 });
    expect(action('a', 'melee_attack', 1, { status: 'pending_roll' }).readinessByStatus()).toBe('in-resolution');
    expect(action('b', 'melee_attack', 1, { status: 'interrupted' }).readinessByStatus()).toBe('done');
    expect(action('c', 'melee_attack', 1, { status: 'expired' }).readinessByStatus()).toBe('done');
  });

  it('holds only an action with its maximum AP', () => {
    const actorRound = load();
    const melee = action('melee', 'melee_attack', 1);
    spend(actorRound, 'melee', 1, 2);

    expect(() => melee.hold(actorRound, 2)).toThrow(expect.objectContaining({ errorCode: 'err-action-hold-below-max' }));
  });

  it('spends the extra AP of a phase on the open action (haste)', () => {
    const actorRound = load({ effects: [effect('haste', 2)] });
    const melee = action('melee', 'melee_attack', 3);
    declare(actorRound, [], melee, 3);

    melee.spendExtraAp(actorRound, 3);
    expect(melee.actionPoints).toBe(2);
    expect(actorRound.ledgerOf('melee').map(entry => entry.phase)).toEqual([3, 3]);
    expect(() => melee.spendExtraAp(actorRound, 3)).toThrow(expect.objectContaining({ errorCode: 'err-action-points-exceeded' }));
  });

  it('a new action on a phase with an extra AP takes it, and keeps the open action going', () => {
    const actorRound = load({ effects: [effect('haste', 2)] });
    const move = action('move', 'movement', 3);
    declare(actorRound, [], move, 3);
    const maneuver = action('maneuver', 'maneuver', 3);

    expect(declare(actorRound, [move], maneuver, 3).interrupted).toEqual([]);
    expect(actorRound.freeCapacity(3)).toBe(0);
  });
});

describe('Interruption (spec 011, §2; criterion 7)', () => {
  it('a new attack interrupts the open one, whose AP stay spent', () => {
    const actorRound = load();
    const first = action('first', 'melee_attack', 1);
    declare(actorRound, [], first, 1);
    spend(actorRound, 'first', 2);
    const second = action('second', 'ranged_attack', 3);

    const plan = declare(actorRound, [first], second, 3);

    expect(plan.interrupted).toEqual([first]);
    expect(first).toMatchObject({ status: 'interrupted', actionPoints: 2, phaseEnd: 2 });
    expect(actorRound.spentByAction('first')).toBe(2);
    expect(actorRound.spentByAction('second')).toBe(1);
    expect(readiness(first, actorRound, 3).readiness).toBe('done');
  });

  it('a movement does not interrupt, nor is it interrupted', () => {
    const actorRound = load();
    const melee = action('melee', 'melee_attack', 1);
    declare(actorRound, [], melee, 1);
    const move = action('move', 'movement', 2);
    expect(declare(actorRound, [melee], move, 2).interrupted).toEqual([]);

    const maneuver = action('maneuver', 'maneuver', 3);
    expect(declare(actorRound, [melee, move], maneuver, 3).interrupted).toEqual([melee]);
    expect(move.status).toBe('declared');
  });

  it('rejects a new action when the actor parried with its open melee attack', () => {
    const actorRound = load();
    const melee = action('melee', 'melee_attack', 1);
    declare(actorRound, [], melee, 1);
    const foeAttack = action('foe-attack', 'melee_attack', 2, {
      actorId: 'foe',
      status: 'pending_roll',
      parries: [new ActionParry('p-1', 'actor-1', 'actor-1', 'parry', 60, 30)],
      updatedAt: new Date('2026-10-21T10:05:00Z'),
    });

    expect(() =>
      Action.checkDeclaration(actorRound, [melee], { actionType: 'maneuver', phaseStart: 2, freeAction: false }, 2, [melee, foeAttack]),
    ).toThrow(expect.objectContaining({ errorCode: 'err-action-must-complete-parried' }));
    // A parry before the melee attack was declared is not with it.
    const earlier = action('earlier', 'melee_attack', 1, {
      actorId: 'foe',
      parries: [new ActionParry('p-2', 'actor-1', 'actor-1', 'parry', 60, 30)],
      updatedAt: new Date('2026-10-21T09:00:00Z'),
    });
    expect(Action.parriedWith(melee, [earlier])).toBe(false);
  });

  it('the create handler saves the new action, the actor round and the interrupted action', async () => {
    const actorRound = load();
    const open = action('open', 'melee_attack', 1);
    spend(actorRound, 'open', 1);
    const game = { id: 'game-1', name: 'g', round: 1, phase: 'phase_2', getActionPhase: () => 2 };
    const actionUpdate = vi.fn((_id: string, updated: Action) => Promise.resolve(updated));
    const actionRepository = {
      findByRsql: vi.fn(() => Promise.resolve({ content: [open] })),
      save: vi.fn((saved: Action) => Promise.resolve(saved)),
      update: actionUpdate,
    } as unknown as ActionRepository;
    const actorRoundUpdate = vi.fn(() => Promise.resolve());
    const actorRoundRepository = {
      findByRsql: vi.fn(() => Promise.resolve({ content: [actorRound] })),
      update: actorRoundUpdate,
    } as unknown as ActorRoundRepository;
    const handler = new CreateActionHandler(
      { findById: vi.fn(() => Promise.resolve(game)) } as unknown as GameRepository,
      actorRoundRepository,
      actionRepository,
      { publish: vi.fn(() => Promise.resolve()) },
      { findSkill: vi.fn(), findManeuverModifiers: vi.fn() },
      { findById: vi.fn(() => Promise.resolve(null)) } as unknown as CharacterPort,
    );

    const created = await handler.execute(
      new CreateActionCommand('game-1', 'actor-1', 'ranged_attack', false, 2, undefined, '', 'user', []),
    );

    expect(created.resolution).toEqual(ActionResolution.normal());
    expect(created.apState).toMatchObject({ actionPoints: 1, readiness: 'ready', readinessPenalty: -50 });
    expect(actorRound.spentByAction(created.id)).toBe(1);
    expect(actorRoundUpdate).toHaveBeenCalledWith(actorRound.id, actorRound);
    expect(actionUpdate).toHaveBeenCalledWith('open', expect.objectContaining({ status: 'interrupted', actionPoints: 1 }));
    await expect(
      handler.execute(new CreateActionCommand('game-1', 'actor-1', 'melee_attack', true, 2, undefined, '', 'user', [])),
    ).rejects.toMatchObject({ errorCode: 'err-action-free-not-allowed' });
  });
});

describe('Forced resolution (spec 011, §6)', () => {
  it('criterion 8: a withdrawal of a 2 AP attack takes the next free AP and resolves with 3 AP at -25', async () => {
    const actorRound = load();
    const melee = action('action-1', 'melee_attack', 1);
    spend(actorRound, 'action-1', 1, 2);

    melee.force(actorRound, 2, 'withdrawal', 'Steps back');
    expect(melee.resolution).toEqual(new ActionResolution('forced', 'withdrawal', 'next-phase', 'Steps back'));
    expect(actorRound.ledgerOf('action-1').map(entry => entry.phase)).toEqual([1, 2, 3]);
    expect(melee.actionPoints).toBe(3);

    const { modifiers } = await prepareAttack({ phase: 2, ledger: [1, 2, 3], resolution: melee.resolution });
    expect(modifiers['action-points']).toBe(-25);
  });

  it('a withdrawal needs an AP spent, and some AP left in the round', () => {
    const actorRound = load();
    expect(() => action('none', 'melee_attack', 1).force(actorRound, 1, 'pass-through')).toThrow(
      expect.objectContaining({ errorCode: 'err-action-force-needs-ap' }),
    );
    spend(actorRound, 'melee', 1, 2, 3, 4);
    expect(() => action('melee', 'melee_attack', 1).force(actorRound, 4, 'withdrawal')).toThrow(
      expect.objectContaining({ errorCode: 'err-action-points-exceeded' }),
    );
  });

  it('criterion 9: attacks forced by an effect take no AP and no AP penalty, several in a round', async () => {
    const actorRound = load();
    spend(actorRound, 'other', 1, 2);
    const plan = Action.checkDeclaration(
      actorRound,
      [],
      { actionType: 'melee_attack', phaseStart: 2, freeAction: false, forced: 'effect' },
      2,
    );
    expect(plan).toEqual({ spend: null, interrupted: [] });
    expect(() =>
      Action.checkDeclaration(actorRound, [], { actionType: 'melee_attack', phaseStart: 2, freeAction: false, forced: 'withdrawal' }, 2),
    ).toThrow(expect.objectContaining({ errorCode: 'err-action-force-invalid-reason' }));

    const forced = action('forced', 'melee_attack', 2, { resolution: ActionResolution.forced('effect') });
    expect(readiness(forced, actorRound, 2)).toEqual({ actionPoints: 0, readiness: 'optimal', readinessPenalty: 0 });
    expect(() => forced.checkResolvable(actorRound, 2)).not.toThrow();

    const first = await prepareAttack({ phase: 2, ledger: [], resolution: ActionResolution.forced('effect') });
    const second = await prepareAttack({ phase: 2, ledger: [], resolution: ActionResolution.forced('effect') });
    expect(first.modifiers['action-points']).toBeUndefined();
    expect(second.modifiers['action-points']).toBeUndefined();
  });

  it('forced by the game master, it keeps the AP spent and their penalty', () => {
    const actorRound = load();
    const melee = action('melee', 'melee_attack', 1);
    spend(actorRound, 'melee', 1);
    melee.force(actorRound, 1, 'gm');

    expect(readiness(melee, actorRound, 1)).toEqual({ actionPoints: 1, readiness: 'ready', readinessPenalty: -75 });
    expect(() => melee.checkResolvable(actorRound, 1)).not.toThrow();
  });

  it('criterion 12: a stored free attack reads as forced by the game master with its full AP', async () => {
    const legacy = action('legacy', 'melee_attack', 2, { freeAction: true, resolution: null, actionPoints: 0 });

    expect(legacy.effectiveResolution()).toEqual(new ActionResolution('forced', 'gm', 'as-spent'));
    expect(readiness(legacy, load(), 2)).toEqual({ actionPoints: 4, readiness: 'optimal', readinessPenalty: 0 });
    const dto = ActionDto.fromEntity(legacy);
    expect(dto).toMatchObject({ freeAction: true, apProfile: { min: 2, max: 4 }, resolution: { mode: 'forced', reason: 'gm' } });

    const { modifiers, prepared } = await prepareAttack({ phase: 2, ledger: [], resolution: null, freeAction: true });
    expect(modifiers['action-points']).toBeUndefined();
    expect(prepared.actionPoints).toBe(4);
  });
});

describe('Validation of the minimum AP when resolving (spec 011, §4)', () => {
  const completeSetup = (target: Action, actorRound: ActorRound, phase: number) => {
    const handler = new CompleteActionHandler(
      { findById: vi.fn(() => Promise.resolve({ id: 'game-1', getActionPhase: () => phase })) } as unknown as GameRepository,
      {
        findByActorIdAndRound: vi.fn(() => Promise.resolve(actorRound)),
        update: vi.fn(() => Promise.resolve()),
      } as unknown as ActorRoundRepository,
      {
        findById: vi.fn(() => Promise.resolve(target)),
        update: vi.fn((_id: string, updated: Action) => Promise.resolve(updated)),
      } as unknown as ActionRepository,
      { publish: vi.fn(() => Promise.resolve()) },
      { findById: vi.fn(() => Promise.resolve({ skills: [] })) } as unknown as CharacterPort,
      { execute: vi.fn(() => Promise.resolve()) } as unknown as CommandBus,
    );
    return () => handler.execute(new CompleteActionCommand(target.id, undefined, 'user', []));
  };

  it('does not complete a simple action without its minimum AP unless forced', async () => {
    const actorRound = load();
    spend(actorRound, 'another', 4);
    const other = action('other', 'other', 4);
    await expect(completeSetup(other, actorRound, 4)()).rejects.toMatchObject({ errorCode: 'err-action-points-below-min' });

    other.resolution = ActionResolution.forced('gm');
    const completed = await completeSetup(other, actorRound, 4)();
    expect(completed).toMatchObject({ status: 'completed', actionPoints: 0, phaseEnd: 4 });
  });

  it('completes a simple action with the AP of the ledger', async () => {
    const actorRound = load();
    const draw = action('draw', 'draw_and_load', 2);
    spend(actorRound, 'draw', 2);
    const completed = await completeSetup(draw, actorRound, 3)();
    expect(completed).toMatchObject({ status: 'completed', actionPoints: 1, phaseStart: 2, phaseEnd: 2 });
    expect(completed.apState?.readiness).toBe('done');
  });
});

describe('AP endpoints (spec 011)', () => {
  const setup = (target: Action, actorRound: ActorRound, phase: number) => {
    const update = vi.fn((_id: string, updated: Action) => Promise.resolve(updated));
    const actorRoundUpdate = vi.fn(() => Promise.resolve());
    const handler = new ManageActionPointsHandler(
      { findById: vi.fn(() => Promise.resolve({ id: 'game-1', round: 1, getActionPhase: () => phase })) } as unknown as GameRepository,
      { findByActorIdAndRound: vi.fn(() => Promise.resolve(actorRound)), update: actorRoundUpdate } as unknown as ActorRoundRepository,
      { findById: vi.fn(() => Promise.resolve(target)), update } as unknown as ActionRepository,
      { publish: vi.fn(() => Promise.resolve()) },
    );
    return { handler, update, actorRoundUpdate };
  };

  it('spend-ap records one more AP of the phase and saves the actor round', async () => {
    const actorRound = load({ effects: [effect('haste', 2)] });
    const melee = action('melee', 'melee_attack', 3);
    spend(actorRound, 'melee', 3);
    const { handler, actorRoundUpdate } = setup(melee, actorRound, 3);

    const result = await handler.execute(new ManageActionPointsCommand('melee', 'spend-ap', 'user', []));

    expect(result.apState).toEqual({ actionPoints: 2, readiness: 'ready', readinessPenalty: -50 });
    expect(actorRoundUpdate).toHaveBeenCalled();
  });

  it('force stores the resolution, and hold the status', async () => {
    const actorRound = load();
    const melee = action('melee', 'melee_attack', 1);
    spend(actorRound, 'melee', 1);
    const forced = await setup(melee, actorRound, 1).handler.execute(
      new ManageActionPointsCommand('melee', 'force', 'user', [], 'pass-through', 'Runs past'),
    );
    expect(forced.resolution).toMatchObject({ mode: 'forced', reason: 'pass-through', apSource: 'next-phase', note: 'Runs past' });
    expect(forced.actionPoints).toBe(2);
    expect(ActionDto.fromEntity(forced).resolution).toEqual({
      mode: 'forced',
      reason: 'pass-through',
      apSource: 'next-phase',
      note: 'Runs past',
    });

    const full = load();
    const dodge = action('dodge', 'other', 1);
    spend(full, 'dodge', 1);
    const held = await setup(dodge, full, 1).handler.execute(new ManageActionPointsCommand('dodge', 'hold', 'user', []));
    expect(held.status).toBe('held');
    expect(ActionDto.fromEntity(held).readiness).toBe('held');
  });
});

describe('ActionApStateService', () => {
  it('reads each game and each round of actor rounds once, and fills the AP state of the DTO', async () => {
    const actorRound = Object.assign(load(), { actorId: 'actor-1' });
    spend(actorRound, 'melee', 1, 2);
    const findByRsql = vi.fn(() => Promise.resolve({ content: [actorRound] }));
    const findById = vi.fn(() => Promise.resolve(Object.assign(Object.create(Game.prototype) as Game, { round: 1, phase: 'phase_2' })));
    const strategicFindById = vi.fn(() => Promise.resolve({ id: 'strategic-1', options: { openRounds: false }, owner: 'user-1' }));
    const service = new ActionApStateService(
      { findById } as unknown as GameRepository,
      { findByRsql } as unknown as ActorRoundRepository,
      { findById: strategicFindById } as unknown as StrategicGameApiClient,
    );
    const melee = action('melee', 'melee_attack', 1);
    const other = action('other', 'maneuver', 2, { status: 'completed', actionPoints: 1 });

    await service.refresh([melee, other]);

    expect(findById).toHaveBeenCalledTimes(1);
    expect(findByRsql).toHaveBeenCalledTimes(1);
    expect(strategicFindById).toHaveBeenCalledTimes(1);
    expect(ActionDto.fromEntity(melee)).toMatchObject({
      actionPoints: 2,
      apProfile: { min: 2, max: 4 },
      readiness: 'ready',
      readinessPenalty: -50,
      resolution: { mode: 'normal' },
    });
    expect(ActionDto.fromEntity(other).readiness).toBe('done');
  });
});
