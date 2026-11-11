import type { CommandBus } from '@nestjs/cqrs';
import { describe, expect, it, vi } from 'vitest';
import type { ActionRepository } from '../../../src/modules/actions/application/ports/action-repository.port.js';
import { Action } from '../../../src/modules/actions/domain/aggregates/action.js';
import { ActionResolution } from '../../../src/modules/actions/domain/value-objects/action-resolution.vo.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { MedicalAbortService } from '../../../src/modules/actor-rounds/application/services/medical-abort.service.js';
import type { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { StartRoundCommand } from '../../../src/modules/games/application/cqrs/commands/start-round.command.js';
import { StartRoundHandler } from '../../../src/modules/games/application/cqrs/handlers/start-round.handler.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import { Game } from '../../../src/modules/games/domain/aggregates/game.js';
import { Actor } from '../../../src/modules/games/domain/value-objects/actor.vo.js';
import type { PsychologyRules } from '../../../src/modules/games/domain/value-objects/game-side.vo.js';
import { FearEaseCommand } from '../../../src/modules/psychology/application/cqrs/commands/fear-ease.command.js';
import { FearEaseHandler } from '../../../src/modules/psychology/application/cqrs/handlers/fear-ease.handler.js';
import { GroupCheckService } from '../../../src/modules/psychology/application/services/group-check.service.js';
import { ActorRoundAlert } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-alert.vo.js';
import type { ActorSheetService } from '../../../src/modules/actor-rounds/application/services/actor-sheet.service.js';
import { Page } from '../../../src/modules/shared/application/pagination/page.js';
import { PSYCHOLOGY_TABLES } from '../../fixtures/psychology-tables.js';
import { effect, load } from '../actor-rounds/actor-round-test.factory.js';

/** The company of Maela (levels 8, 4, 2, 2, 2) against three orcs of level 3 (workspace spec 100). */
const MEMBERS: [string, number, string][] = [
  ['maela', 8, 'company'],
  ['iven', 4, 'company'],
  ['soldier-1', 2, 'mercenaries'],
  ['soldier-2', 2, 'mercenaries'],
  ['soldier-3', 2, 'mercenaries'],
  ['orc-1', 3, 'orcs'],
  ['orc-2', 3, 'orcs'],
  ['orc-3', 3, 'orcs'],
];

const game = (rules: PsychologyRules | undefined, extra: Partial<Parameters<typeof Game.fromProps>[0]> = {}) =>
  Game.fromProps({
    id: 'game-1',
    strategicGameId: 'sg-1',
    name: 'Ford',
    status: 'in_progress',
    round: 1,
    phase: 'upkeep',
    factions: ['company', 'mercenaries', 'orcs'],
    actors: MEMBERS.map(([id, , faction]) =>
      Actor.fromProps({ id, name: id, faction: { id: faction, name: faction }, type: 'character', owner: 'gm' }),
    ),
    sides: [
      { id: 'allies', name: 'Allies', factionIds: ['company', 'mercenaries'], leaderActorId: 'maela' },
      { id: 'orcs', name: null, factionIds: ['orcs'], leaderActorId: null },
    ],
    psychologyRules: rules,
    owner: 'gm',
    createdAt: new Date('2026-01-01'),
    ...extra,
  });

const rounds = (effects: Record<string, string>, round = 1) =>
  MEMBERS.map(([actorId, level, factionId]) =>
    Object.assign(load({ level, factionId, round, effects: effects[actorId] ? [effect(effects[actorId], 10)] : [] }), {
      id: `${actorId}-${round}`,
      actorId,
    }),
  );

const attack = (actorId: string, targetId: string, positionalTarget = 'none') =>
  Action.fromProps({
    id: `${actorId}-attack`,
    gameId: 'game-1',
    actorId,
    round: 1,
    actionType: 'melee_attack',
    freeAction: false,
    phaseStart: 1,
    phaseEnd: 1,
    status: 'completed',
    actionPoints: 4,
    movement: null,
    attacks: [{ attackName: 'claw', status: 'completed', modifiers: { targetId, positionalTarget } } as never],
    parries: null,
    maneuver: null,
    fatigue: null,
    description: null,
    resolution: ActionResolution.normal(),
    owner: 'gm',
    createdAt: new Date(),
    updatedAt: null,
  });

const upkeep = (current: Game, actorRounds: ActorRound[], actions: Action[] = []) => {
  const page = <T>(items: T[]) => Promise.resolve(new Page(items, 0, 1000, items.length));
  const gameRepository = { findById: vi.fn(() => Promise.resolve(current)), update: vi.fn((g: Game) => Promise.resolve(g)) };
  const actorRoundRepository = {
    findByRsql: vi.fn(() => page(actorRounds)),
    update: vi.fn((updated: ActorRound) => Promise.resolve(updated)),
  } as unknown as ActorRoundRepository;
  const actionRepository = { findByRsql: vi.fn(() => page(actions)) } as unknown as ActionRepository;
  const handler = new StartRoundHandler(
    gameRepository as unknown as GameRepository,
    { publish: vi.fn() },
    { execute: vi.fn(() => Promise.resolve()) } as unknown as CommandBus,
    actorRoundRepository,
    actionRepository,
    { findById: vi.fn() },
    new MedicalAbortService(actorRoundRepository),
    { find: vi.fn(() => Promise.resolve(PSYCHOLOGY_TABLES)) },
  );
  return handler.execute(new StartRoundCommand('game-1', 'gm', []));
};

const alertsOf = (actorRounds: ActorRound[], type: string) =>
  actorRounds.flatMap(actorRound => actorRound.alerts.filter(alert => alert.type === type).map(alert => ({ actorRound, alert })));
const texts = (alert: ActorRoundAlert, key: string) =>
  (alert.modifiers ?? []).filter(modifier => modifier.key === key).map(modifier => modifier.modifier);

describe('fear alerts of the upkeep by side (workspace spec 100, decisions 19-22)', () => {
  it('house: Maela and a soldier down alert the side once, at level 10, with its factions and triggers', async () => {
    const current = game('house');
    const actorRounds = rounds({ maela: 'dead', 'soldier-1': 'unconscious' });
    const updated = await upkeep(current, actorRounds);
    const [suggested, ...others] = alertsOf(actorRounds, 'fear-check-suggested');
    expect(others.filter(other => texts(other.alert, 'sideId')[0] === 'allies')).toEqual([]);
    expect(suggested.actorRound.actorId).toBe('iven');
    expect(suggested.alert.getModifierText('factionId')).toBe('company');
    expect(suggested.alert.getModifierText('sideId')).toBe('allies');
    expect(texts(suggested.alert, 'factionIds')).toEqual(['company', 'mercenaries']);
    expect(suggested.alert.getModifierText('rules')).toBe('house');
    expect(texts(suggested.alert, 'triggers')).toEqual(['strength-50', 'strength-below-50', 'leader-down']);
    expect(suggested.alert.getModifierValue('frightLevel')).toBe(10);
    expect(suggested.alert.getModifierValue('fallenShare')).toBe(0.56);
    expect(updated.fearThresholdsAlerted['side:allies']).toEqual(['strength-50', 'strength-below-50', 'leader-down']);
    // The first upkeep records the fallen levels of each side
    expect(updated.sideFallenLevels).toEqual({ allies: 10, orcs: 0 });
  });

  it('book: by heads (2 of 5 is 40%) with the thresholds of the tables, and no house alerts', async () => {
    const actorRounds = rounds({ maela: 'dead', 'soldier-1': 'unconscious' });
    const updated = await upkeep(game(undefined), actorRounds, [attack('orc-1', 'iven'), attack('orc-2', 'iven'), attack('orc-3', 'iven')]);
    const [suggested] = alertsOf(actorRounds, 'fear-check-suggested');
    expect(suggested.alert.getModifierValue('fallenShare')).toBe(0.4);
    expect(suggested.alert.getModifierText('rules')).toBe('book');
    expect(updated.fearThresholdsAlerted['side:allies']).toEqual(['0.4']);
    expect(alertsOf(actorRounds, 'fear-surrounded')).toEqual([]);
    expect(updated.sideFallenLevels).toEqual({});
  });

  it('house: an actor attacked by three enemies in the round gets the surrounded alert', async () => {
    const actorRounds = rounds({});
    const updated = await upkeep(game('house'), actorRounds, [
      attack('orc-1', 'iven'),
      attack('orc-2', 'iven'),
      attack('orc-3', 'iven', 'rear'),
    ]);
    const [surrounded] = alertsOf(actorRounds, 'fear-surrounded');
    expect(surrounded.actorRound.actorId).toBe('iven');
    expect(surrounded.alert.getModifierText('resistance')).toBe('fear');
    expect(surrounded.alert.getModifierValue('level')).toBe(10);
    expect(texts(surrounded.alert, 'attackerIds')).toEqual(['orc-1', 'orc-2', 'orc-3']);
    expect(updated.fearThresholdsAlerted['actor:iven']).toEqual(['surrounded']);
  });

  it('house: the side that won the round is offered to ease the fear, and fear-ease lifts it', async () => {
    const actorRounds = rounds({ iven: 'fear-balk', 'soldier-2': 'fear-retreat', 'orc-1': 'dead', 'orc-2': 'dead' });
    const current = game('house', { sideFallenLevels: { allies: 0, orcs: 0 } });
    await upkeep(current, actorRounds);
    const [ease] = alertsOf(actorRounds, 'fear-ease-suggested');
    expect(ease.actorRound.actorId).toBe('maela');
    expect(ease.alert.getModifierText('sideId')).toBe('allies');
    expect(texts(ease.alert, 'actorIds')).toEqual(['iven', 'soldier-2']);
    expect(current.sideFallenLevels).toEqual({ allies: 0, orcs: 6 });

    // POST fear-ease: the effects go and the alert is resolved
    const games = { findById: vi.fn(() => Promise.resolve(current)) } as unknown as GameRepository;
    const update = vi.fn((actorRound: ActorRound) => Promise.resolve(actorRound));
    const repository = { findByRsql: vi.fn(() => Promise.resolve({ content: actorRounds })), update } as unknown as ActorRoundRepository;
    const handler = new FearEaseHandler(new GroupCheckService(games, repository, {} as ActorSheetService));
    expect(await handler.execute(new FearEaseCommand('game-1', 'allies', 'gm', []))).toEqual({ actorIds: ['iven', 'soldier-2'] });
    const byId = (id: string) => actorRounds.find(each => each.actorId === id)!;
    expect(byId('iven').hasEffect('fear-balk')).toBe(false);
    expect(byId('soldier-2').hasEffect('fear-retreat')).toBe(false);
    expect(ease.alert.status).toBe('resolved');
    expect(ease.alert.result).toMatchObject({ outcome: 'eased' });
    expect(update).toHaveBeenCalledTimes(3);
    await expect(handler.execute(new FearEaseCommand('game-1', 'nobody', 'gm', []))).rejects.toMatchObject({
      statusCode: 404,
      code: 'err-side-not-found',
    });
  });
});
