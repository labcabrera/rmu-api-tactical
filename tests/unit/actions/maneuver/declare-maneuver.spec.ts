import { describe, expect, it, vi } from 'vitest';
import {
  CreateActionCommand,
  CreateActionCommandManeuver,
} from '../../../../src/modules/actions/application/cqrs/commands/create-action.command';
import { CreateActionHandler } from '../../../../src/modules/actions/application/cqrs/handlers/create-action.handler';
import type { ActionEventBusPort } from '../../../../src/modules/actions/application/ports/action-event-bus.port';
import type { ActionRepository } from '../../../../src/modules/actions/application/ports/action.repository';
import type { Action } from '../../../../src/modules/actions/domain/aggregates/action.aggregate';
import type { ActorRoundRepository } from '../../../../src/modules/actor-rounds/application/ports/actor-round.repository';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game.repository';
import type { CharacterPort } from '../../../../src/modules/strategic/application/ports/character.port';
import { load } from '../../actor-rounds/actor-round-test.factory';
import { action, setupManeuver } from './maneuver-test.factory';

const previous = (overrides: Partial<Action> = {}, progress = 60, completed = false): Action =>
  action({
    id: 'previous',
    round: 1,
    status: 'completed',
    maneuver: {
      modifiers: { skillId: 'desk-work', maneuverType: 'percent', specialization: null },
      progress,
      result: { percent: 60, completed },
    },
    ...overrides,
  });

const declare = (maneuver: CreateActionCommandManeuver, existing: Action[] = [previous()]) => {
  const { skillCatalog } = setupManeuver();
  const game = { id: 'game-1', name: 'g', round: 2, phase: 'phase_1', getActionPhase: () => 1 };
  const gameRepository = { findById: vi.fn(() => Promise.resolve(game)) } as unknown as GameRepository;
  const actorRoundRepository = {
    findByRsql: vi.fn(() => Promise.resolve({ content: [load({ round: 2 })] })),
    update: vi.fn(() => Promise.resolve()),
  } as unknown as ActorRoundRepository;
  const actionRepository = {
    findById: vi.fn((id: string) => Promise.resolve(existing.find(a => a.id === id) ?? null)),
    findByRsql: vi.fn(() => Promise.resolve({ content: [] })),
    save: vi.fn((saved: Action) => Promise.resolve(saved)),
  } as unknown as ActionRepository;
  const eventBus = { publish: vi.fn(() => Promise.resolve()) } as unknown as ActionEventBusPort;
  const characterClient = { findById: vi.fn(() => Promise.resolve(null)) } as unknown as CharacterPort;
  const handler = new CreateActionHandler(gameRepository, actorRoundRepository, actionRepository, eventBus, skillCatalog, characterClient);
  return handler.execute(new CreateActionCommand('game-1', 'actor-1', 'maneuver', false, 1, maneuver, '', 'user-1', []));
};

describe('Declaring a maneuver', () => {
  it('takes the maneuver type of the skill profile when none is declared', async () => {
    expect((await declare({ skillId: 'desk-work' })).maneuver!.modifiers.maneuverType).toBe('percent');
    expect((await declare({ skillId: 'old-lore' })).maneuver!.modifiers.maneuverType).toBe('absolute');
    expect((await declare({ skillId: 'old-lore', maneuverType: 'percent' })).maneuver!.modifiers.maneuverType).toBe('percent');
  });

  it('continues an unfinished percent maneuver of the actor and inherits its progress', async () => {
    const created = await declare({ skillId: 'desk-work', continuesActionId: 'previous' });
    expect(created.maneuver).toMatchObject({ continuesActionId: 'previous', progress: 60, modifiers: { maneuverType: 'percent' } });
  });

  it.each([
    ['another actor', previous({ actorId: 'actor-2' })],
    [
      'an absolute maneuver',
      action({ id: 'previous', status: 'completed', maneuver: { modifiers: { skillId: 'desk-work', maneuverType: 'absolute' } } }),
    ],
    ['a completed task', previous({}, 110, true)],
    ['an unresolved maneuver', previous({ status: 'declared' })],
    ['another skill', previous({ maneuver: { modifiers: { skillId: 'old-lore', maneuverType: 'percent' }, progress: 10 } })],
    ['not a maneuver', action({ id: 'previous', actionType: 'movement', status: 'completed' })],
  ])('rejects continuing %s', async (_name, continued) => {
    await expect(declare({ skillId: 'desk-work', continuesActionId: 'previous' }, [continued])).rejects.toMatchObject({
      errorCode: 'err-maneuver-invalid-continuation',
    });
  });

  it('rejects continuing an action that does not exist', async () => {
    await expect(declare({ skillId: 'desk-work', continuesActionId: 'nope' })).rejects.toMatchObject({
      errorCode: 'err-maneuver-invalid-continuation',
    });
  });
});
