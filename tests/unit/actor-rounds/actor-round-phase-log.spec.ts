import { describe, expect, it, jest } from '@jest/globals';
import type { ActionRepository } from '../../../src/modules/actions/application/ports/action.repository';
import { Action, ActionProps } from '../../../src/modules/actions/domain/aggregates/action.aggregate';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round.repository';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.aggregate';
import { StartPhaseCommand } from '../../../src/modules/games/application/cqrs/commands/start-phase.command';
import { StartPhaseHandler } from '../../../src/modules/games/application/cqrs/handlers/start-phase.handler';
import type { GameEventBusPort } from '../../../src/modules/games/application/ports/game-event-bus.port';
import type { GameRepository } from '../../../src/modules/games/application/ports/game.repository';
import { Game } from '../../../src/modules/games/domain/aggregates/game.aggregate';
import type { GamePhase } from '../../../src/modules/games/domain/value-objects/game-phase.vo';
import { Page } from '../../../src/modules/shared/domain/entities/page.entity';
import { load } from './actor-round-test.factory';

const action = (actorId: string, phaseStart: number, phaseEnd: number | null, extra: Partial<ActionProps> = {}) =>
  Action.fromProps({
    id: `${actorId}-${phaseStart}`,
    gameId: 'game-1',
    actorId,
    round: 1,
    actionType: 'melee_attack',
    freeAction: false,
    phaseStart,
    phaseEnd,
    status: phaseEnd === null ? 'declared' : 'completed',
    actionPoints: null,
    movement: null,
    attacks: null,
    parries: null,
    maneuver: null,
    fatigue: null,
    description: null,
    owner: 'user-1',
    createdAt: new Date(),
    updatedAt: null,
    ...extra,
  });

const game = (phase: GamePhase) =>
  Game.fromProps({
    id: 'game-1',
    strategicGameId: 'strategic-1',
    name: 'Test',
    status: 'in_progress',
    round: 1,
    phase,
    factions: [],
    actors: [],
    owner: 'user-1',
    createdAt: new Date(),
  });

const setup = (phase: GamePhase, actorRounds: ActorRound[], actions: Action[]) => {
  const gameRepository = {
    findById: jest.fn(() => Promise.resolve(game(phase))),
    update: jest.fn((_id: string, updated: Game) => Promise.resolve(updated)),
  } as unknown as GameRepository;
  const update = jest.fn((_id: string, updated: ActorRound) => Promise.resolve(updated));
  const actorRoundRepository = {
    findWithUndefinedInitiativeRoll: jest.fn(() => Promise.resolve([])),
    findByRsql: jest.fn(() => Promise.resolve(new Page(actorRounds, 0, 1000, actorRounds.length))),
    update,
  } as unknown as ActorRoundRepository;
  const actionRepository = {
    findByRsql: jest.fn(() => Promise.resolve(new Page(actions, 0, 1000, actions.length))),
  } as unknown as ActionRepository;
  const eventBus = { publish: jest.fn() } as unknown as GameEventBusPort;
  const handler = new StartPhaseHandler(gameRepository, actorRoundRepository, actionRepository, eventBus);
  return { run: () => handler.execute(new StartPhaseCommand('game-1', 'user-1', [])), update };
};

const actorRound = (actorId: string) => {
  const round = load({});
  return ActorRound.fromProps({ ...round.getProps(), actorId });
};

describe('Action AP per phase (spec 007, §10)', () => {
  it('spends 1 AP in each phase an action spans, also while it is in progress', () => {
    const inProgress = action('a', 2, null);
    const completed = action('a', 1, 2);

    expect([1, 2, 3, 4].map(phase => inProgress.spendsApInPhase(phase))).toEqual([false, true, true, true]);
    expect([1, 2, 3].map(phase => completed.spendsApInPhase(phase))).toEqual([true, true, false]);
    expect(action('a', 1, 1, { freeAction: true }).spendsApInPhase(1)).toBe(false);
  });

  it('counts 1 AP per phase whatever the number of actions, and only the completed ones in the current phase', () => {
    const actions = [action('a', 1, 2), action('a', 2, null)];

    expect(Action.spentApInPhase(actions, 2)).toBe(1);
    expect(Action.spentApInPhase([], 2)).toBe(0);
    expect(Action.completedApInPhase(actions, 2)).toBe(1);
    expect(Action.completedApInPhase(actions, 3)).toBe(0);
  });
});

describe('ActorRound phase log', () => {
  it('accumulates the AP of the phases and replaces the entry of a phase logged twice', () => {
    const round = load({});

    round.logPhase(1, 1);
    round.logPhase(2, 0);
    round.logPhase(3, 1);
    round.logPhase(2, 1);

    expect(round.phaseLog.map(entry => ({ ...entry }))).toEqual([
      { phase: 1, spentAp: 1, totalSpentAp: 1 },
      { phase: 2, spentAp: 1, totalSpentAp: 2 },
      { phase: 3, spentAp: 1, totalSpentAp: 2 },
    ]);
  });

  it('gives the AP spent before a phase, plus the AP already spent in it', () => {
    const round = load({});
    round.logPhase(1, 1);
    round.logPhase(2, 1);

    expect(round.getSpentAp(1)).toBe(0);
    expect(round.getSpentAp(3)).toBe(2);
    expect(round.getSpentAp(3, 1)).toBe(3);
  });

  it('starts empty every round', () => {
    const round = load({});
    round.logPhase(1, 1);

    expect(ActorRound.createFromPrevious(round).phaseLog).toEqual([]);
  });
});

describe('StartPhaseHandler phase log', () => {
  it('logs the phase that ends for every actor, 0 for those without actions', async () => {
    const attacker = actorRound('attacker');
    const idle = actorRound('idle');
    attacker.logPhase(1, 0);
    // An action declared in phase 2 and still in progress in phase 3 spends 1 AP in phase 2.
    const { run, update } = setup('phase_2', [attacker, idle], [action('attacker', 2, null)]);

    const result = await run();

    expect(result.phase).toBe('phase_3');
    expect(update).toHaveBeenCalledTimes(2);
    expect(attacker.phaseLog.map(entry => ({ ...entry }))).toEqual([
      { phase: 1, spentAp: 0, totalSpentAp: 0 },
      { phase: 2, spentAp: 1, totalSpentAp: 1 },
    ]);
    expect(idle.phaseLog.map(entry => ({ ...entry }))).toEqual([{ phase: 2, spentAp: 0, totalSpentAp: 0 }]);
  });

  it('logs the 4th phase when moving to the upkeep', async () => {
    const attacker = actorRound('attacker');
    const { run } = setup('phase_4', [attacker], [action('attacker', 3, 4)]);

    expect((await run()).phase).toBe('upkeep');
    expect(attacker.phaseLog.map(entry => ({ ...entry }))).toEqual([{ phase: 4, spentAp: 1, totalSpentAp: 1 }]);
  });

  it('logs nothing when the initiative phase ends', async () => {
    const attacker = actorRound('attacker');
    const { run, update } = setup('declare_initiative', [attacker], []);

    expect((await run()).phase).toBe('phase_1');
    expect(update).not.toHaveBeenCalled();
    expect(attacker.phaseLog).toEqual([]);
  });
});
