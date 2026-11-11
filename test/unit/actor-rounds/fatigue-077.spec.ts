import { describe, expect, it, vi } from 'vitest';
import { ResolveMovementCommand } from '../../../src/modules/actions/application/cqrs/commands/resolve-movement.command.js';
import { ResolveMovementHandler } from '../../../src/modules/actions/application/cqrs/handlers/resolve-movement.handler.js';
import type { ActionRepository } from '../../../src/modules/actions/application/ports/action-repository.port.js';
import type { MovementProcessorService } from '../../../src/modules/actions/application/services/movement-processor.service.js';
import type { Action } from '../../../src/modules/actions/domain/aggregates/action.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundFatigue } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-fatigue.vo.js';
import { ActorRoundCharacterMapperAdapter } from '../../../src/modules/actor-rounds/infrastructure/mappers/actor-round-character-mapper.adapter.js';
import { ActorRoundNpcMapperAdapter } from '../../../src/modules/actor-rounds/infrastructure/mappers/actor-round-npc-mapper.adapter.js';
import { ActorRoundDto } from '../../../src/modules/actor-rounds/interfaces/http/dto/actor-round.dto.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import { Game } from '../../../src/modules/games/domain/aggregates/game.js';
import { TacticalGameOutcomeCalculator } from '../../../src/modules/games/domain/services/tactical-game-outcome.calculator.js';
import { Actor } from '../../../src/modules/games/domain/value-objects/actor.vo.js';
import type { Npc } from '../../../src/modules/npcs/application/ports/npc.port.js';
import type { Character } from '../../../src/modules/strategic/application/ports/character.port.js';
import type { StrategicGamePort } from '../../../src/modules/strategic/application/ports/strategic-game.port.js';
import { action, movementAction } from '../actions/maneuver/maneuver-test.factory.js';
import { effect, load } from './actor-round-test.factory.js';

/*
 * Workspace spec 077, decisions D6-D10, with the examples of §5.5 (-45 goes in 45 minutes; -50 with an injury of -15)
 * and made-up sheets.
 */

const penaltyOf = (round: ActorRound, source: string) => round.getPenaltiesBySource().find(p => p.source === source)?.value;

/** Upkeeps `rounds` rounds in a row, carrying the actor round, with exertion in the rounds `exert` says. */
const rest = (round: ActorRound, rounds: number, options: { slow?: boolean; exert?: (index: number) => boolean } = {}) => {
  let current = round;
  for (let index = 0; index < rounds; index++) {
    if (options.exert?.(index)) current.addFatigue(1);
    current.applyUpkeep({ slowFatigueRecovery: options.slow });
    current = ActorRound.createFromPrevious(current);
  }
  return current;
};

describe('Fatigue recovery in the upkeep (workspace spec 077, decision D7)', () => {
  it('12 rounds of rest take one point of fatigue away', () => {
    const round = load();
    round.applyEnduranceResult(20, 0);
    const after = rest(round, 12);
    expect(after.fatigue.fatigue).toBe(19);
    expect(after.fatigue.restRounds).toBe(12);
    expect(penaltyOf(after, 'fatigue')).toBe(-19);
  });

  it('§5.5: -45 goes in 45 minutes of rest', () => {
    const round = load();
    round.applyEnduranceResult(45, 0);
    expect(rest(round, 45 * 12 - 1).fatigue.fatigue).toBe(1);
    expect(rest(round, 45 * 12).fatigue.fatigue).toBe(0);
  });

  it('takes 24 rounds a point at altitude', () => {
    const round = load();
    round.applyEnduranceResult(10, 0);
    expect(rest(round, 12, { slow: true }).fatigue.fatigue).toBe(10);
    expect(rest(round, 24, { slow: true }).fatigue.fatigue).toBe(9);
  });

  it('an exerted round starts the rest again; walking (no fatigue) is rest (P14)', () => {
    const round = load();
    round.applyEnduranceResult(10, 0);
    const exerted = rest(round, 12, { exert: index => index === 6 });
    expect(exerted.fatigue.fatigue).toBe(10);
    expect(exerted.fatigue.restRounds).toBe(5);
  });

  it('after 12 rounds of rest the accumulator goes back to 0 and its alert goes', () => {
    const round = load();
    round.addFatigue(120);
    expect(round.alerts.map(alert => alert.type)).toEqual(['endurance']);
    round.applyUpkeep();
    expect(rest(ActorRound.createFromPrevious(round), 11).fatigue.accumulator).toBe(120);
    const next = rest(ActorRound.createFromPrevious(round), 12);
    expect(next.fatigue.accumulator).toBe(0);
    expect(next.alerts.some(alert => alert.type === 'endurance')).toBe(false);
  });

  it('reads older stored fatigue without the rest fields', () => {
    const round = ActorRound.fromProps({
      ...load().getProps(),
      fatigue: { endurance: 5, fatigue: 3, accumulator: 7 } as ActorRoundFatigue,
    });
    expect(round.fatigue).toMatchObject({ endurance: 5, fatigue: 3, accumulator: 7, restRounds: 0, exerted: false });
  });
});

describe('Fatigue of the criticals (workspace spec 077, decision D8)', () => {
  it('is a fatigue-critical penalty outside the -50 cap, gone after 12 rounds of rest', () => {
    const round = load({ hp: [100, 100] });
    round.applyEnduranceResult(50, 0);
    round.applyAttackResults(undefined, [effect('fatigue', -10), effect('fatigue', -5)], undefined);
    expect(penaltyOf(round, 'fatigue')).toBe(-50);
    expect(penaltyOf(round, 'fatigue-critical')).toBe(-15);
    const after = rest(round, 12);
    expect(penaltyOf(after, 'fatigue-critical')).toBeUndefined();
    expect(after.effects.some(each => each.status === 'fatigue')).toBe(false);
    expect(penaltyOf(after, 'fatigue')).toBe(-49);
  });

  it('§5.5: past -50 the fatigue is an injury (-50 with an injury of -15)', () => {
    const round = load({ hp: [100, 100] });
    round.applyEnduranceResult(45, 0);
    round.applyEnduranceResult(20, 0);
    expect(penaltyOf(round, 'fatigue')).toBe(-50);
    expect(round.injuries[0]).toMatchObject({ penalty: -15 });
  });
});

describe('Fatigue of the movements (workspace spec 077, decision D6)', () => {
  /** A normal movement of 1 AP after `previousAp` AP of movement in the round (workspace spec 081, decision 6). */
  const move = async (previousAp: number, accumulator: number) => {
    const actorRound = load();
    actorRound.fatigue.accumulator = accumulator;
    const movement = action({ id: 'move-1', actionType: 'movement', movement: null });
    actorRound.spend(1, 'move-1', 1);
    const process = vi.fn((_roll: number | null, target: Action) => {
      target.movement = movementAction('walk').movement;
      return Promise.resolve();
    });
    const update = vi.fn((updated: ActorRound) => Promise.resolve(updated));
    const handler = new ResolveMovementHandler(
      { process } as unknown as MovementProcessorService,
      {
        findById: vi.fn(() => Promise.resolve({ id: 'game-1', round: 1, strategicGameId: 'sg-1', getActionPhase: () => 1 })),
      } as unknown as GameRepository,
      {
        findByActorIdAndRound: vi.fn(() => Promise.resolve(actorRound)),
        findByRsql: vi.fn(() => Promise.resolve({ content: [actorRound] })),
        update,
      } as unknown as ActorRoundRepository,
      {
        findById: vi.fn(() => Promise.resolve(movement)),
        findByRsql: vi.fn(() =>
          Promise.resolve({
            content: previousAp
              ? [action({ id: 'move-0', actionType: 'movement', status: 'completed', actionPoints: previousAp, movement: null })]
              : [],
          }),
        ),
        update: vi.fn((a: Action) => Promise.resolve(a)),
      } as unknown as ActionRepository,
      { findById: vi.fn(() => Promise.resolve({ id: 'sg-1', options: null })) } as unknown as StrategicGamePort,
      { publish: vi.fn() },
    );
    await handler.execute(new ResolveMovementCommand('move-1', { requiredManeuver: false } as never, null, null, 'user-1', []));
    return { actorRound, movement };
  };

  it('a sprint that passes 100 raises the endurance alert and exerts the actor', async () => {
    const { actorRound, movement } = await move(3, 95);
    expect(movement.fatigue).toBeCloseTo(50 - 100 / 12);
    expect(actorRound.fatigue.accumulator).toBeCloseTo(95 + 50 - 100 / 12);
    expect(actorRound.fatigue.exerted).toBe(true);
    expect(actorRound.alerts.map(alert => alert.type)).toEqual(['endurance']);
  });

  it('jog and run follow Table 5-5 by the AP of the round, and the first AP is walking', async () => {
    expect((await move(1, 0)).movement.fatigue).toBeCloseTo(100 / 60);
    expect((await move(2, 0)).movement.fatigue).toBeCloseTo(100 / 12 - 100 / 60);
    const walk = await move(0, 0);
    expect(walk.movement.fatigue).toBeNull();
    expect(walk.actorRound.fatigue.exerted).toBe(false);
  });
});

const sheet = (overrides: Partial<Character> = {}): Character =>
  ({
    id: 'character-1',
    gameId: 'sg-1',
    faction: { id: 'faction-1' },
    name: 'Kirax',
    info: { raceName: 'Human', raceId: 'human', sizeId: 'medium', height: 6 },
    experience: { level: 3 },
    movement: { baseMovementRate: 20, maxPace: 'dash' },
    defense: { defensiveBonus: 10, armor: { at: 1, bodyAt: 1, headAt: 1, armsAt: 1, legsAt: 1 }, shield: null, protect: 0 },
    hp: { max: 50, current: 50 },
    initiative: { totalBonus: 5 },
    skills: [{ skillId: 'body-development', specialization: null, ranks: 6, totalBonus: 32 }],
    endurance: { fatiguePenalty: 20, racialBonus: 5 },
    traits: [],
    items: [],
    equipment: { slots: {}, maneuverPenalty: 0, encumbrancePenalty: 0, movementBaseDifficulty: 'm' },
    attacks: [],
    imageUrl: undefined,
    owner: 'user-1',
    ...overrides,
  }) as unknown as Character;

describe('Fatigue to and from strategic (workspace spec 077, decisions D9-D10)', () => {
  it('the actor round takes the fatigue of the sheet (capped at 50), its endurance and its height', () => {
    const round = new ActorRoundCharacterMapperAdapter().toActorRound('game-1', 1, sheet());
    expect(round.fatigue).toMatchObject({ fatigue: 20, endurance: 37, accumulator: 0 });
    expect(round.snapshot?.fatigue).toBe(20);
    expect(round.height).toBe(6);
    expect(penaltyOf(round, 'fatigue')).toBe(-20);
    expect(ActorRoundDto.fromEntity(round).fatigue).toMatchObject({ fatigue: 20, endurance: 37, restRounds: 0, exerted: false });
    const tired = new ActorRoundCharacterMapperAdapter().toActorRound('game-1', 1, sheet({ endurance: { fatiguePenalty: 70 } }));
    expect(tired.fatigue.fatigue).toBe(50);
    const older = new ActorRoundCharacterMapperAdapter().toActorRound('game-1', 1, sheet({ endurance: undefined, skills: [] }));
    expect(older.fatigue).toMatchObject({ fatigue: 0, endurance: 0 });
  });

  it('an NPC takes its Body Development as endurance, else 0, and no height', () => {
    const npc = (skills: Npc['skills']) =>
      ({
        id: 'npc-1',
        size: 'medium',
        category: 'beast',
        level: 2,
        hp: 30,
        db: 10,
        at: 1,
        initiative: 0,
        skills,
        attacks: [],
      }) as unknown as Npc;
    const actor = { id: 'wolf-1', name: 'Wolf', faction: { id: 'f1' }, owner: 'gm' } as never;
    const mapper = new ActorRoundNpcMapperAdapter();
    const strong = mapper.toActorRound(
      'game-1',
      1,
      actor,
      npc([{ skillId: 'body-development', specialization: null, ranks: 4, bonus: 25 }]),
    );
    expect(strong.fatigue.endurance).toBe(25);
    expect(strong.height).toBeNull();
    expect(mapper.toActorRound('game-1', 1, actor, npc([])).fatigue.endurance).toBe(0);
  });

  it('round trip: 20 brought, 35 at the end, delta 15; the fatigue of the criticals stays in the game', () => {
    const game = Game.fromProps({
      id: 'game-1',
      strategicGameId: 'sg-1',
      name: 'Moria',
      status: 'in_progress',
      round: 2,
      phase: 'phase_2',
      factions: ['f1'],
      actors: [Actor.fromProps({ id: 'character-1', name: 'Kirax', faction: { id: 'f1', name: 'F' }, type: 'character', owner: 'gm' })],
      owner: 'gm',
      createdAt: new Date(),
    });
    const first = new ActorRoundCharacterMapperAdapter().toActorRound('game-1', 1, sheet());
    const last = ActorRound.createFromPrevious(first);
    last.applyEnduranceResult(15, 0);
    last.applyAttackResults(undefined, [effect('fatigue', -10)], undefined);
    const [outcome] = TacticalGameOutcomeCalculator.preview(game, [first, last]).characters;
    expect(outcome.fatigue).toEqual({ start: 20, end: 35, delta: 15 });
  });

  it('an actor round without the fatigue it brought sends no fatigue', () => {
    const game = Game.fromProps({
      id: 'game-1',
      strategicGameId: 'sg-1',
      name: 'Moria',
      status: 'in_progress',
      round: 1,
      phase: 'phase_1',
      factions: ['f1'],
      actors: [Actor.fromProps({ id: 'actor-1', name: 'Old', faction: { id: 'f1', name: 'F' }, type: 'character', owner: 'gm' })],
      owner: 'gm',
      createdAt: new Date(),
    });
    const round = load();
    round.snapshot = { hp: 50, injuryIds: [], conditionIds: [] };
    const [outcome] = TacticalGameOutcomeCalculator.preview(game, [round]).characters;
    expect(outcome.fatigue).toBeUndefined();
  });
});
