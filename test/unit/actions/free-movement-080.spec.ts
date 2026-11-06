import { describe, expect, it, vi } from 'vitest';
import { ATTACK_TABLE_MODIFIERS_FAKE } from '../../fixtures/attack-table-modifiers.js';
import {
  PrepareAttackCommand,
  type PrepareAttackCommandModifiers,
} from '../../../src/modules/actions/application/cqrs/commands/prepare-attack.command.js';
import { ResolveMovementCommand } from '../../../src/modules/actions/application/cqrs/commands/resolve-movement.command.js';
import { PrepareAttackHandler } from '../../../src/modules/actions/application/cqrs/handlers/prepare-attack.handler.js';
import { ResolveMovementHandler } from '../../../src/modules/actions/application/cqrs/handlers/resolve-movement.handler.js';
import type { ActionRepository } from '../../../src/modules/actions/application/ports/action-repository.port.js';
import {
  COMBAT_PLUGIN_LIST,
  CombatPluginRegistryService,
  CombatProcessor,
} from '../../../src/modules/actions/application/services/combat/index.js';
import { Action, type ActionProps } from '../../../src/modules/actions/domain/aggregates/action.js';
import {
  actionPhaseRange,
  effectiveActionPace,
  freeMovementPace,
} from '../../../src/modules/actions/domain/services/free-movement-pace.js';
import type { ActionMovementModifiers } from '../../../src/modules/actions/domain/value-objects/action-movement.vo.js';
import { ActionResolution } from '../../../src/modules/actions/domain/value-objects/action-resolution.vo.js';
import type { ActionType } from '../../../src/modules/actions/domain/value-objects/action-type.vo.js';
import type { Pace } from '../../../src/modules/actions/domain/value-objects/pace.vo.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ApLedgerEntry } from '../../../src/modules/actor-rounds/domain/value-objects/ap-ledger-entry.vo.js';
import { ActorRoundTrait, QUICK_ACTION } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import type { CharacterPort } from '../../../src/modules/strategic/application/ports/character.port.js';
import type { StrategicGameApiClient } from '../../../src/modules/strategic/infrastructure/api-clients/api.strategic-game.adapter.js';
import { load } from '../actor-rounds/actor-round-test.factory.js';
import { sheetsOf } from '../support/actor-sheets.js';
import { createCombatPluginContext } from './combat/combat-plugin-test.factory.js';
import { movementAction, setupManeuver } from './maneuver/maneuver-test.factory.js';

/* Workspace spec 080 (Core Law §8.2): free movement. Invented actors, bonuses and paces. */

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
    createdAt: new Date('2026-11-06T10:00:00Z'),
    updatedAt: null,
    ...extra,
  });

const declare = (actorRound: ActorRound, actions: Action[], newAction: Action, phase: number) => {
  const plan = Action.checkDeclaration(
    actorRound,
    actions,
    { actionType: newAction.actionType, phaseStart: newAction.phaseStart, freeAction: newAction.freeAction },
    phase,
  );
  newAction.applyDeclaration(actorRound, plan, phase);
  return plan;
};

/** A resolved free movement of the actor over the phases given. */
const moved = (pace: Pace, id: string, phaseStart: number, phaseEnd: number, extra: Partial<ActionProps> = {}) =>
  movementAction(pace, id, { phaseStart, phaseEnd, ...extra });

describe('free movement costs no AP and is not the instantaneous action (decision 1)', () => {
  it('is a free movement only as an instantaneous movement', () => {
    expect(action('m', 'movement', 1, { freeAction: true }).isFreeMovement()).toBe(true);
    expect(action('m', 'movement', 1).isFreeMovement()).toBe(false);
    expect(action('p', 'maneuver', 1, { freeAction: true }).isFreeMovement()).toBe(false);
  });

  it('does not count as the instantaneous action of the round', () => {
    expect(action('m', 'movement', 1, { freeAction: true }).countsAsInstant()).toBe(false);
    expect(action('p', 'maneuver', 1, { freeAction: true }).countsAsInstant()).toBe(true);
  });

  it('takes 0 AP after the instantaneous action of the round is used, and leaves it to the next one', () => {
    const actorRound = load();
    const instant = action('instant', 'maneuver', 1, { freeAction: true });
    expect(declare(actorRound, [], instant, 1).spend).toEqual({ phase: 1, ap: 0, kind: 'instant' });

    const movement = action('move', 'movement', 1, { freeAction: true });
    expect(declare(actorRound, [instant], movement, 1)).toEqual({ spend: { phase: 1, ap: 0, kind: 'instant' }, interrupted: [] });

    const second = action('move-2', 'movement', 2, { freeAction: true });
    expect(declare(actorRound, [instant, movement], second, 2).spend).toEqual({ phase: 2, ap: 0, kind: 'instant' });
    expect(actorRound.freeCapacity(1)).toBe(1);
  });

  it('leaves the instantaneous action to the others when it comes first', () => {
    const actorRound = load();
    const movement = action('move', 'movement', 1, { freeAction: true });
    declare(actorRound, [], movement, 1);
    const instant = action('instant', 'maneuver', 1, { freeAction: true });
    expect(declare(actorRound, [movement], instant, 1).spend).toEqual({ phase: 1, ap: 0, kind: 'instant' });
    // A second instantaneous action takes 1 AP: the free movement did not count.
    const another = action('instant-2', 'maneuver', 1, { freeAction: true });
    expect(declare(actorRound, [movement, instant], another, 1).spend).toEqual({ phase: 1, ap: 1, kind: 'instant' });
  });

  it('leaves both instants of Quick Action to the other actions', () => {
    const actorRound = load();
    actorRound.traits = [new ActorRoundTrait(QUICK_ACTION, 1, null)];
    const movement = action('move', 'movement', 1, { freeAction: true });
    declare(actorRound, [], movement, 1);
    const first = action('instant', 'maneuver', 1, { freeAction: true });
    expect(declare(actorRound, [movement], first, 1).spend?.ap).toBe(0);
    const second = action('instant-2', 'maneuver', 1, { freeAction: true });
    expect(declare(actorRound, [movement, first], second, 1).spend?.ap).toBe(0);
  });

  it('covers every phase up to the one it is resolved in', () => {
    const actorRound = load();
    const movement = action('move', 'movement', 1, { freeAction: true });
    declare(actorRound, [], movement, 1);
    movement.close(actorRound, 3);
    expect([movement.phaseStart, movement.phaseEnd, movement.actionPoints]).toEqual([1, 3, 0]);
  });
});

describe('free movement goes up to run (decision 2)', () => {
  const resolve = async (freeAction: boolean, pace: string) => {
    const movement = action('move', 'movement', 1, { freeAction });
    const handler = new ResolveMovementHandler(
      {} as never,
      { findById: vi.fn(() => Promise.resolve({ id: 'game-1' })) } as unknown as GameRepository,
      {} as never,
      { findById: vi.fn(() => Promise.resolve(movement)) } as unknown as ActionRepository,
      {} as never,
      {} as never,
    );
    const modifiers = { pace, requiredManeuver: false } as unknown as ActionMovementModifiers;
    return handler.execute(new ResolveMovementCommand('move', modifiers, null, null, 'user', []));
  };

  it.each(['sprint', 'dash'])('rejects a free movement at %s', async pace => {
    await expect(resolve(true, pace)).rejects.toMatchObject({ code: 'err-free-movement-pace', details: { pace } });
  });

  it('lets a free movement run, and a movement paid with AP sprint', async () => {
    // Past the check: the next step needs repositories the test does not give.
    await expect(resolve(true, 'run')).rejects.not.toMatchObject({ code: 'err-free-movement-pace' });
    await expect(resolve(false, 'sprint')).rejects.not.toMatchObject({ code: 'err-free-movement-pace' });
  });
});

describe('pace of the free movement at the same time (decision 3)', () => {
  it('takes the fastest resolved free movement of the actor whose phases overlap', () => {
    const actions = [moved('walk', 'm1', 1, 1), moved('jog', 'm2', 2, 3), moved('run', 'm3', 4, 4)];
    expect(freeMovementPace(actions, 'actor-1', 1, 1, 2)).toEqual({ pace: 'jog', movementId: 'm2' });
    expect(freeMovementPace(actions, 'actor-1', 1, 1, 1)).toEqual({ pace: 'walk', movementId: 'm1' });
    expect(freeMovementPace(actions, 'actor-1', 1, 3, 4)).toEqual({ pace: 'run', movementId: 'm3' });
  });

  it('ignores movements paid with AP, unresolved ones, other actors and other rounds', () => {
    const actions = [
      moved('run', 'paid', 1, 1, { freeAction: false }),
      moved('run', 'open', 1, 1, { status: 'declared' }),
      moved('run', 'other', 1, 1, { actorId: 'actor-2' }),
      moved('run', 'old', 1, 1, { round: 0 }),
    ];
    expect(freeMovementPace(actions, 'actor-1', 1, 1, 4)).toBeNull();
  });

  it('reads an older free movement faster than run as run', () => {
    expect(freeMovementPace([moved('dash', 'm1', 1, 1)], 'actor-1', 1, 1, 1)).toEqual({ pace: 'run', movementId: 'm1' });
  });

  it('spans an open action up to the current phase', () => {
    expect(actionPhaseRange(action('a', 'maneuver', 2), 3)).toEqual([2, 3]);
    expect(actionPhaseRange(action('a', 'maneuver', 2, { phaseEnd: 2 }), 4)).toEqual([2, 2]);
    expect(actionPhaseRange(action('a', 'maneuver', 2), null)).toEqual([2, 2]);
  });

  it('keeps the faster of the manual pace and the free movement', () => {
    const movement = { pace: 'jog' as Pace, movementId: 'm1' };
    expect(effectiveActionPace('walk', movement)).toEqual({ pace: 'jog', source: 'free-movement', movementId: 'm1' });
    expect(effectiveActionPace('jog', movement)).toEqual({ pace: 'jog', source: 'free-movement', movementId: 'm1' });
    expect(effectiveActionPace('run', movement)).toEqual({ pace: 'run', source: 'manual' });
    expect(effectiveActionPace(undefined, null)).toBeUndefined();
  });
});

describe('maneuvers take the pace of the free movement only (decision 3)', () => {
  const pace = async (otherActions: Action[], phase = 'phase_1') => {
    const setup = setupManeuver({ otherActions, phase });
    const context = await setup.contextService.load(setup.action, setup.game);
    return context.base.find(modifier => modifier.key === 'pace');
  };

  it('a free movement at the same time gives the pace line, with the movement', async () => {
    expect(await pace([moved('jog', 'm1', 1, 1)])).toEqual({
      key: 'pace',
      value: -50,
      source: 'movement',
      group: 'situation',
      rule: 'Table 5-3',
      params: { pace: 'jog', source: 'free-movement', movementId: 'm1' },
    });
  });

  it('a movement paid with AP or a free movement of other phases does not penalize the maneuver', async () => {
    expect(await pace([moved('run', 'paid', 1, 1, { freeAction: false })])).toBeUndefined();
    expect(await pace([moved('run', 'later', 2, 3)])).toBeUndefined();
    // An open maneuver from phase 1 spans up to the current phase.
    expect((await pace([moved('walk', 'later', 2, 3)], 'phase_3'))?.value).toBe(-25);
  });
});

describe('attacks take the faster of the manual pace and the free movement (decision 3)', () => {
  const prepare = async (manual: string | undefined, roundActions: Action[], footwork = 0) => {
    const ctx = createCombatPluginContext();
    ctx.sourceActor!.apLedger = [1, 2].map(phase => new ApLedgerEntry(phase, ctx.action.id, 1, 'spent'));
    const handler = new PrepareAttackHandler(
      {
        findById: vi.fn(() =>
          Promise.resolve({
            id: 'game-1',
            round: 1,
            strategicGameId: 'sg-1',
            checkValidActionManagement: () => undefined,
            getActionPhase: () => 2,
          }),
        ),
      } as unknown as GameRepository,
      { findByGameAndRoundAndActors: vi.fn(() => Promise.resolve(ctx.actors)) } as unknown as ActorRoundRepository,
      {
        findById: vi.fn(() => Promise.resolve(ctx.action)),
        findByRsql: vi.fn(() => Promise.resolve({ content: [ctx.action, ...roundActions] })),
        update: vi.fn((updated: Action) => Promise.resolve(updated)),
      } as unknown as ActionRepository,
      sheetsOf({
        findById: vi.fn(() => Promise.resolve({ skills: [{ skillId: 'footwork', totalBonus: footwork, ranks: 1 }], traits: [] })),
      } as unknown as CharacterPort),
      { findById: vi.fn(() => Promise.resolve({ options: {} })) } as unknown as StrategicGameApiClient,
      { publish: vi.fn(() => Promise.resolve()) },
      new CombatProcessor(new CombatPluginRegistryService(COMBAT_PLUGIN_LIST)),
      ATTACK_TABLE_MODIFIERS_FAKE,
    );
    const modifiers = { targetId: 'defender-1', bo: 60, pace: manual } as PrepareAttackCommandModifiers;
    const prepared = await handler.execute(
      new PrepareAttackCommand(ctx.action.id, [{ attackName: 'Longsword', modifiers, protectors: null }], 'user', []),
    );
    return prepared.attacks![0].calculated!;
  };
  const attacker = (pace: Pace, extra: Partial<ActionProps> = {}) => moved(pace, 'move-1', 1, 1, { actorId: 'attacker-1', ...extra });

  it('the free movement wins over a slower manual pace, and says so', async () => {
    const calculated = await prepare('walk', [attacker('jog')]);
    expect(calculated.rollModifiers.find(modifier => modifier.key === 'pace-penalty')).toMatchObject({
      value: -50,
      params: { pace: 'jog', source: 'free-movement', movementId: 'move-1' },
    });
    expect(calculated.pace).toEqual({ pace: 'jog', source: 'free-movement', movementId: 'move-1' });
  });

  it('a faster manual pace wins', async () => {
    const calculated = await prepare('run', [attacker('walk')]);
    const line = calculated.rollModifiers.find(modifier => modifier.key === 'pace-penalty');
    expect(line?.value).toBe(-75);
    expect(line?.params).toBeUndefined();
    expect(calculated.pace).toEqual({ pace: 'run', source: 'manual' });
  });

  it('Footwork offsets the pace of the free movement', async () => {
    const calculated = await prepare(undefined, [attacker('jog')], 20);
    expect(calculated.rollModifiers.find(modifier => modifier.key === 'pace-penalty-skill')?.value).toBe(20);
  });

  it('a movement paid with AP sets no pace', async () => {
    const calculated = await prepare(undefined, [attacker('run', { freeAction: false })]);
    expect(calculated.rollModifiers.some(modifier => modifier.key === 'pace-penalty')).toBe(false);
    expect(calculated.pace).toBeUndefined();
  });
});
