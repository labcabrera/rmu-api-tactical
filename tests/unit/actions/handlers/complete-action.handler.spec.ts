import { describe, expect, it, jest } from '@jest/globals';
import type { CommandBus } from '@nestjs/cqrs';
import { CompleteActionCommand } from '../../../../src/modules/actions/application/cqrs/commands/complete-action.command';
import { CompleteActionHandler } from '../../../../src/modules/actions/application/cqrs/handlers/complete-action.handler';
import type { ActionEventBusPort } from '../../../../src/modules/actions/application/ports/action-event-bus.port';
import type { ActionRepository } from '../../../../src/modules/actions/application/ports/action.repository';
import type { Action } from '../../../../src/modules/actions/domain/aggregates/action.aggregate';
import { DeleteEffectCommand } from '../../../../src/modules/actor-rounds/application/cqrs/commands/delete-effect.command';
import type { ActorRoundRepository } from '../../../../src/modules/actor-rounds/application/ports/actor-round.repository';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game.repository';

const setup = (actionType: string, extra: Partial<Action> = {}) => {
  const action = {
    id: 'action-1',
    gameId: 'game-1',
    actorId: 'actor-1',
    round: 1,
    actionType,
    freeAction: false,
    phaseStart: 2,
    phaseEnd: null,
    status: 'declared',
    description: null,
    ...extra,
  } as unknown as Action;
  const actionRepository = {
    findById: jest.fn(() => Promise.resolve(action)),
    update: jest.fn((_id: string, updated: Action) => Promise.resolve(updated)),
  } as unknown as ActionRepository;
  const gameRepository = {
    findById: jest.fn(() => Promise.resolve({ id: 'game-1', getActionPhase: () => 3 })),
  } as unknown as GameRepository;
  const actorRoundRepository = {
    findByActorIdAndRound: jest.fn(() =>
      Promise.resolve({
        id: 'ar-1',
        effects: [
          { id: 'e-1', status: 'prone' },
          { id: 'e-2', status: 'stunned' },
        ],
      }),
    ),
  } as unknown as ActorRoundRepository;
  const publish = jest.fn(() => Promise.resolve());
  const execute = jest.fn(() => Promise.resolve());
  const eventBus = { publish } as unknown as ActionEventBusPort;
  const commandBus = { execute } as unknown as CommandBus;
  const handler = new CompleteActionHandler(gameRepository, actorRoundRepository, actionRepository, eventBus, commandBus);
  const run = (note?: string) => handler.execute(new CompleteActionCommand('action-1', note, 'user-1', []));
  return { run, publish, execute };
};

describe('CompleteActionHandler', () => {
  it('ends the action in the current phase and spends one action point per phase', async () => {
    const { run, publish } = setup('draw_and_load');
    const result = await run('Draws a dagger');
    expect(result.status).toBe('completed');
    expect(result.phaseEnd).toBe(3);
    expect(result.actionPoints).toBe(2);
    expect(result.description).toBe('Draws a dagger');
    expect(publish).toHaveBeenCalled();
  });

  it('spends no action points for a free action', async () => {
    const { run } = setup('other', { freeAction: true } as Partial<Action>);
    expect((await run()).actionPoints).toBe(0);
  });

  it('clears only the prone effects when standing up', async () => {
    const { run, execute } = setup('stand_up');
    await run();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(new DeleteEffectCommand('ar-1', 'e-1', 'user-1', []));
  });

  it('rejects actions that need a resolution and completed actions', async () => {
    await expect(setup('melee_attack').run()).rejects.toThrow('cannot be completed');
    await expect(setup('dodge', { status: 'completed' } as Partial<Action>).run()).rejects.toThrow('already completed');
  });
});
