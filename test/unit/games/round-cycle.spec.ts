import type { ActionRepository } from '../../../src/modules/actions/application/ports/action-repository.port.js';
import { Action, type ActionProps } from '../../../src/modules/actions/domain/aggregates/action.js';
import { ActionApProfile } from '../../../src/modules/actions/domain/value-objects/action-ap-profile.vo.js';
import { ActionResolution } from '../../../src/modules/actions/domain/value-objects/action-resolution.vo.js';
import type { ActionType } from '../../../src/modules/actions/domain/value-objects/action-type.vo.js';
import { ActionDto } from '../../../src/modules/actions/interfaces/http/dto/action.dto.js';
import { CreateActorRoundCommand } from '../../../src/modules/actor-rounds/application/cqrs/commands/create-actor-round.command.js';
import { UpkeepActorRoundCommand } from '../../../src/modules/actor-rounds/application/cqrs/commands/upkeep-actor-round.command.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundEffect } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { StartPhaseCommand } from '../../../src/modules/games/application/cqrs/commands/start-phase.command.js';
import { StartRoundCommand } from '../../../src/modules/games/application/cqrs/commands/start-round.command.js';
import { StartPhaseHandler } from '../../../src/modules/games/application/cqrs/handlers/start-phase.handler.js';
import { StartRoundHandler } from '../../../src/modules/games/application/cqrs/handlers/start-round.handler.js';
import type { DomainEventPublisher } from '../../../src/modules/shared/application/ports/domain-event-publisher.port.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import { Game } from '../../../src/modules/games/domain/aggregates/game.js';
import { Actor } from '../../../src/modules/games/domain/value-objects/actor.vo.js';
import type { GamePhase } from '../../../src/modules/games/domain/value-objects/game-phase.vo.js';
import { Page } from '../../../src/modules/shared/application/pagination/page.js';
import type { StrategicGamePort } from '../../../src/modules/strategic/application/ports/strategic-game.port.js';
import { effect, load } from '../actor-rounds/actor-round-test.factory.js';
import type { CommandBus } from '@nestjs/cqrs';

const ACTOR = 'actor-1';

const action = (id: string, actionType: ActionType, phaseStart: number, extra: Partial<ActionProps> = {}): Action =>
  Action.fromProps({
    id,
    gameId: 'game-1',
    actorId: ACTOR,
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
    owner: 'user-1',
    createdAt: new Date(),
    updatedAt: null,
    ...extra,
  });

const game = (phase: GamePhase, round = 1) =>
  Game.fromProps({
    id: 'game-1',
    strategicGameId: 'strategic-1',
    name: 'Test',
    status: 'in_progress',
    round,
    phase,
    factions: [],
    actors: [Actor.fromProps({ id: ACTOR, name: 'Actor', faction: { id: 'f-1' } as never, type: 'character', owner: 'user-1' })],
    owner: 'user-1',
    createdAt: new Date(),
  });

/** Adds effects to an actor round as an attack does, in the given phase. */
const addEffects = (round: ActorRound, effects: ActorRoundEffect[], phase: number) =>
  round.applyAttackResults(0, effects, undefined, { phase, spentAp: round.getSpentAp(phase) });

/** A game whose phases advance in memory, with in-memory repositories of actor rounds and actions. */
const world = (initial: Game, actorRounds: ActorRound[], actions: Action[], openRounds?: boolean) => {
  let current = initial;
  const gameRepository = {
    findById: vi.fn(() => Promise.resolve(current)),
    update: vi.fn((updated: Game) => {
      current = updated;
      return Promise.resolve(updated);
    }),
  } as unknown as GameRepository;
  const byRound = <T extends { round: number }>(items: T[], rsql: string) => {
    const round = Number(/round==(\d+)/.exec(rsql)?.[1]);
    const content = items.filter(item => item.round === round);
    return Promise.resolve(new Page(content, 0, 1000, content.length));
  };
  const actorRoundUpdate = vi.fn((updated: ActorRound) => Promise.resolve(updated));
  const actorRoundRepository = {
    findWithUndefinedInitiativeRoll: vi.fn(() => Promise.resolve([])),
    findByRsql: vi.fn((rsql: string) => byRound(actorRounds, rsql)),
    update: actorRoundUpdate,
  } as unknown as ActorRoundRepository;
  const actionSave = vi.fn((saved: Action) => {
    actions.push(saved);
    return Promise.resolve(saved);
  });
  const actionUpdate = vi.fn((updated: Action) => Promise.resolve(updated));
  const actionRepository = {
    findByRsql: vi.fn((rsql: string) => byRound(actions, rsql)),
    save: actionSave,
    update: actionUpdate,
  } as unknown as ActionRepository;
  const eventBus = { publish: vi.fn() } as unknown as DomainEventPublisher;
  const commands: object[] = [];
  const commandBus = {
    execute: vi.fn((command: object) => {
      commands.push(command);
      if (command instanceof UpkeepActorRoundCommand) {
        actorRounds.find(ar => ar.id === command.actorRoundId && ar.round === command.round)?.applyUpkeep();
      }
      if (command instanceof CreateActorRoundCommand) {
        const previous = actorRounds.find(ar => ar.actorId === command.actor.id && ar.round === command.round - 1)!;
        actorRounds.push(ActorRound.createFromPrevious(previous));
      }
      return Promise.resolve();
    }),
  } as unknown as CommandBus;
  const strategicFindById = vi.fn(() =>
    Promise.resolve({ id: 'strategic-1', owner: 'user-1', options: openRounds === undefined ? null : { openRounds } }),
  );
  const strategicGameClient = { findById: strategicFindById } as unknown as StrategicGamePort;
  const startPhase = new StartPhaseHandler(gameRepository, actorRoundRepository, actionRepository, eventBus);
  const startRound = new StartRoundHandler(
    gameRepository,
    eventBus,
    commandBus,
    actorRoundRepository,
    actionRepository,
    strategicGameClient,
  );
  return {
    nextPhase: () => startPhase.execute(new StartPhaseCommand('game-1', 'user-1', [])),
    nextRound: () => startRound.execute(new StartRoundCommand('game-1', 'user-1', [])),
    actorRound: (round: number) => actorRounds.find(ar => ar.actorId === ACTOR && ar.round === round)!,
    continuationOf: (id: string) => actions.find(a => a.continuesActionId === id),
    actionSave,
    actionUpdate,
    actorRoundUpdate,
    commands,
    strategicFindById,
  };
};

const ledger = (actorRound: ActorRound, actionId: string) => actorRound.ledgerOf(actionId).map(entry => ({ ...entry }));

describe('StartPhaseHandler: carrying open actions (spec 011, §5)', () => {
  it('gives 1 AP of the new phase to an open action automatically (criterion 5)', async () => {
    const actorRound = load({});
    const melee = action('melee', 'melee_attack', 1);
    actorRound.spend(1, 'melee', 1);
    const { nextPhase, actionUpdate } = world(game('phase_1'), [actorRound], [melee]);

    expect((await nextPhase()).phase).toBe('phase_2');

    expect(ledger(actorRound, 'melee')).toEqual([
      { phase: 1, actionId: 'melee', ap: 1, kind: 'spent' },
      { phase: 2, actionId: 'melee', ap: 1, kind: 'spent' },
    ]);
    expect(melee.readiness(actorRound, 2)).toMatchObject({ actionPoints: 2, readiness: 'ready', readinessPenalty: -50 });
    expect(actionUpdate).toHaveBeenCalledWith(melee);
  });

  it('interrupts the open action of an unconscious actor (criterion 5)', async () => {
    const actorRound = load({ effects: [effect('unconscious')] });
    const melee = action('melee', 'melee_attack', 1);
    actorRound.spend(1, 'melee', 1);
    const { nextPhase } = world(game('phase_1'), [actorRound], [melee]);

    await nextPhase();

    expect(melee.status).toBe('interrupted');
    expect(melee.actionPoints).toBe(1);
    expect(melee.phaseEnd).toBe(1);
    expect(ledger(actorRound, 'melee')).toHaveLength(1);
  });

  it('interrupts the open actions of a dead or dying actor, or one without AP this round', async () => {
    for (const status of ['dead', 'dying', 'unconscious', 'flatfooted']) {
      const actorRound = load({ effects: [effect(status)] });
      const melee = action('melee', 'melee_attack', 1);
      const { nextPhase } = world(game('phase_1'), [actorRound], [melee]);

      await nextPhase();

      expect([status, melee.status]).toEqual([status, 'interrupted']);
    }
  });

  it('records the AP as lost when staggered takes the next phase, and the effect goes in the upkeep (criterion 4)', async () => {
    const actorRound = load({});
    const melee = action('melee', 'melee_attack', 1);
    actorRound.spend(1, 'melee', 1);
    const { nextPhase } = world(game('phase_1'), [actorRound], [melee]);
    await nextPhase();
    // Staggered in phase 2: its AP is already spent, so it takes the one of phase 3.
    addEffects(actorRound, [effect('staggered')], 2);
    expect(actorRound.apCapacity).toEqual([1, 1, 0, 1]);

    await nextPhase();

    expect(ledger(actorRound, 'melee')).toEqual([
      { phase: 1, actionId: 'melee', ap: 1, kind: 'spent' },
      { phase: 2, actionId: 'melee', ap: 1, kind: 'spent' },
      { phase: 3, actionId: 'melee', ap: 1, kind: 'lost' },
    ]);
    expect(melee.apOf(actorRound, 3)).toBe(2);
    expect(melee.status).toBe('declared');

    await nextPhase();
    expect(melee.apOf(actorRound, 4)).toBe(3);
    actorRound.applyUpkeep();
    expect(actorRound.effects.some(e => e.status === 'staggered')).toBe(false);
  });

  it('spends nothing moving to the upkeep, and leaves held, forced, instantaneous and resolving actions alone', async () => {
    const actorRound = load({});
    const open = action('open', 'melee_attack', 4);
    actorRound.spend(4, 'open', 1);
    const { nextPhase } = world(game('phase_4'), [actorRound], [open]);
    expect((await nextPhase()).phase).toBe('upkeep');
    expect(ledger(actorRound, 'open')).toHaveLength(1);

    const other = load({});
    const actions = [
      action('held', 'melee_attack', 1, { status: 'held' }),
      action('forced', 'melee_attack', 1, { resolution: ActionResolution.forced('effect') }),
      action('instant', 'other', 1, { freeAction: true }),
      action('prepared', 'ranged_attack', 1, { status: 'pending_roll' }),
    ];
    const second = world(game('phase_1'), [other], actions);
    await second.nextPhase();
    expect(other.apLedger).toEqual([]);
    expect(second.actionUpdate).not.toHaveBeenCalled();
  });

  it('records the AP only once per phase, so a phase change can run again', () => {
    const actorRound = load({});
    const melee = action('melee', 'melee_attack', 1);
    actorRound.spend(1, 'melee', 1);

    expect(melee.advanceToPhase(actorRound, 2)).toBe('spent');
    expect(melee.advanceToPhase(actorRound, 2)).toBeUndefined();
    expect(actorRound.spentByAction('melee')).toBe(2);
  });

  it('records lost AP for the second open action when the phase has capacity for one only', async () => {
    const actorRound = load({});
    const movement = action('movement', 'movement', 1, { createdAt: new Date(1) });
    const melee = action('melee', 'melee_attack', 1, { createdAt: new Date(2) });
    // A movement does not interrupt the attack: both are open, and phase 2 has 1 AP.
    const { nextPhase } = world(game('phase_1'), [actorRound], [movement, melee]);

    await nextPhase();

    expect(ledger(actorRound, 'movement')).toEqual([{ phase: 2, actionId: 'movement', ap: 1, kind: 'spent' }]);
    expect(ledger(actorRound, 'melee')).toEqual([{ phase: 2, actionId: 'melee', ap: 1, kind: 'lost' }]);
  });
});

describe('StartRoundHandler (spec 011, §5)', () => {
  it('creates the actor rounds of the new round after the upkeep and starts the round', async () => {
    const actorRound = load({});
    const { nextRound, commands, strategicFindById } = world(game('upkeep'), [actorRound], []);

    const result = await nextRound();

    expect(result.round).toBe(2);
    expect(result.phase).toBe('declare_initiative');
    expect(commands.map(command => command.constructor.name)).toEqual(['UpkeepActorRoundCommand', 'CreateActorRoundCommand']);
    // Without open actions the strategic game is not read.
    expect(strategicFindById).not.toHaveBeenCalled();
  });

  it('continues an attack started in phase 4 in the next round, where it reaches 2 AP in phase 1 (criterion 6)', async () => {
    const actorRound = load({});
    const melee = action('melee', 'melee_attack', 4, { attacks: [{ attackName: 'sword', modifiers: { targetId: 'foe' } } as never] });
    actorRound.spend(4, 'melee', 1);
    const w = world(game('upkeep'), [actorRound], [melee]);

    await w.nextRound();

    expect(melee.status).toBe('carried');
    expect(melee.actionPoints).toBe(1);
    expect(melee.phaseEnd).toBe(4);
    const continuation = w.continuationOf('melee')!;
    expect(continuation).toMatchObject({
      round: 2,
      actionType: 'melee_attack',
      phaseStart: 1,
      status: 'declared',
      continuesActionId: 'melee',
      carriedAp: 1,
    });
    expect(continuation.attacks).toEqual(melee.attacks);
    expect(continuation.attacks).not.toBe(melee.attacks);
    expect(w.actionSave).toHaveBeenCalledWith(continuation);
    expect(w.actionUpdate).toHaveBeenCalledWith(melee);

    const next = w.actorRound(2);
    expect(continuation.readiness(next, 1)).toMatchObject({ actionPoints: 1, readiness: 'blocked' });
    expect((await w.nextPhase()).phase).toBe('phase_1');
    expect(ledger(next, continuation.id)).toEqual([{ phase: 1, actionId: continuation.id, ap: 1, kind: 'spent' }]);
    expect(continuation.readiness(next, 1)).toEqual({ actionPoints: 2, readiness: 'ready', readinessPenalty: -50 });
    expect(ActionDto.fromEntity(continuation)).toMatchObject({ continuesActionId: 'melee', carriedAp: 1, actionPoints: 2 });
  });

  it('expires the open action without open rounds (criterion 6)', async () => {
    const actorRound = load({});
    const melee = action('melee', 'melee_attack', 4);
    actorRound.spend(4, 'melee', 1);
    const w = world(game('upkeep'), [actorRound], [melee], false);

    await w.nextRound();

    expect(melee.status).toBe('expired');
    expect(melee.actionPoints).toBe(1);
    expect(w.continuationOf('melee')).toBeUndefined();
    expect(w.actionUpdate).toHaveBeenCalledWith(melee);
  });

  it('carries a multi-round action whatever the option', async () => {
    const actorRound = load({});
    const long = action('long', 'other', 3);
    vi.spyOn(long, 'apProfile').mockReturnValue(new ActionApProfile(6, 6, 0, true));
    actorRound.spend(3, 'long', 1);
    actorRound.spend(4, 'long', 1);
    const w = world(game('upkeep'), [actorRound], [long], false);

    await w.nextRound();

    expect(long.status).toBe('carried');
    expect(w.continuationOf('long')).toMatchObject({ carriedAp: 2, status: 'declared' });
  });

  it('carries a held action as a held continuation whatever the option, and it takes no AP in phase 1', async () => {
    const actorRound = load({});
    const held = action('held', 'ranged_attack', 2, { status: 'held' });
    [2, 3, 4].forEach(phase => actorRound.spend(phase, 'held', 1));
    const w = world(game('upkeep'), [actorRound], [held], false);

    await w.nextRound();

    expect(held.status).toBe('carried');
    const continuation = w.continuationOf('held')!;
    expect(continuation).toMatchObject({ status: 'held', carriedAp: 3 });
    await w.nextPhase();
    expect(w.actorRound(2).ledgerOf(continuation.id)).toEqual([]);
    expect(continuation.readiness(w.actorRound(2), 1)).toMatchObject({ actionPoints: 3, readiness: 'held' });
  });

  it('expires instantaneous actions, interrupts those of an incapacitated actor and skips resolving or closed ones', async () => {
    const actorRound = load({});
    const instant = action('instant', 'other', 4, { freeAction: true });
    const resolving = action('resolving', 'ranged_attack', 3, { status: 'pending_roll' });
    const completed = action('completed', 'other', 1, { status: 'completed', phaseEnd: 1 });
    const w = world(game('upkeep'), [actorRound], [instant, resolving, completed]);

    await w.nextRound();

    expect(instant.status).toBe('expired');
    expect(resolving.status).toBe('pending_roll');
    expect(completed.status).toBe('completed');
    expect(w.actionUpdate).toHaveBeenCalledTimes(1);

    const dying = load({ effects: [effect('dying', undefined, 3)] });
    const melee = action('melee', 'melee_attack', 4);
    dying.spend(4, 'melee', 1);
    const second = world(game('upkeep'), [dying], [melee]);
    await second.nextRound();
    expect(melee.status).toBe('interrupted');
    expect(second.continuationOf('melee')).toBeUndefined();
  });

  it('carries a legacy action with the AP of the phases it spans', async () => {
    const actorRound = load({});
    const legacy = action('legacy', 'melee_attack', 3, { resolution: null });
    const w = world(game('upkeep'), [actorRound], [legacy]);

    await w.nextRound();

    expect(legacy.status).toBe('carried');
    expect(w.continuationOf('legacy')).toMatchObject({ carriedAp: 2, resolution: ActionResolution.normal() });
    expect(w.actorRoundUpdate).toHaveBeenCalledWith(actorRound);
  });
});
