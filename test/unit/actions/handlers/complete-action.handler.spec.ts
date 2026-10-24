import { describe, expect, it, vi } from 'vitest';
import type { CommandBus } from '@nestjs/cqrs';
import { CompleteActionCommand } from '../../../../src/modules/actions/application/cqrs/commands/complete-action.command';
import { CompleteActionHandler } from '../../../../src/modules/actions/application/cqrs/handlers/complete-action.handler';
import type { DomainEventPublisher } from '../../../../src/modules/shared/application/ports/domain-event-publisher.port';
import type { ActionRepository } from '../../../../src/modules/actions/application/ports/action-repository.port';
import { Action, ActionProps } from '../../../../src/modules/actions/domain/aggregates/action';
import type { ActionType } from '../../../../src/modules/actions/domain/value-objects/action-type.vo';
import { DeleteEffectCommand } from '../../../../src/modules/actor-rounds/application/cqrs/commands/delete-effect.command';
import type { ActorRoundRepository } from '../../../../src/modules/actor-rounds/application/ports/actor-round-repository.port';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game-repository.port';
import { ActorRound } from '../../../../src/modules/actor-rounds/domain/aggregates/actor-round';
import { ActorRoundShield } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-shield.vo';
import type { CharacterPort } from '../../../../src/modules/strategic/application/ports/character.port';

const setup = (actionType: string, extra: Partial<ActionProps> = {}, options: { acrobaticsRanks?: number; shield?: boolean } = {}) => {
  const action = Action.fromProps({
    id: 'action-1',
    gameId: 'game-1',
    actorId: 'actor-1',
    round: 1,
    actionType: actionType as ActionType,
    freeAction: false,
    phaseStart: 2,
    phaseEnd: null,
    status: 'declared',
    actionPoints: null,
    movement: null,
    attacks: null,
    parries: null,
    maneuver: null,
    fatigue: null,
    description: null,
    owner: 'owner',
    createdAt: new Date(),
    updatedAt: null,
    ...extra,
  });
  const actionRepository = {
    findById: vi.fn(() => Promise.resolve(action)),
    update: vi.fn((_id: string, updated: Action) => Promise.resolve(updated)),
  } as unknown as ActionRepository;
  const gameRepository = {
    findById: vi.fn(() => Promise.resolve({ id: 'game-1', getActionPhase: () => 3 })),
  } as unknown as GameRepository;
  const actorRound = Object.assign(ActorRound.empty(), {
    id: 'ar-1',
    effects: [
      { id: 'e-1', status: 'prone' },
      { id: 'e-2', status: 'stunned' },
    ],
    defense: { shield: options.shield ? new ActorRoundShield(20, 2, 0) : null },
  });
  const updateActorRound = vi.fn(() => Promise.resolve());
  const actorRoundRepository = {
    findByActorIdAndRound: vi.fn(() => Promise.resolve(actorRound)),
    update: updateActorRound,
  } as unknown as ActorRoundRepository;
  const characterClient = {
    findById: vi.fn(() => Promise.resolve({ skills: [{ skillId: 'acrobatics', totalBonus: 30, ranks: options.acrobaticsRanks ?? 0 }] })),
  } as unknown as CharacterPort;
  const publish = vi.fn(() => Promise.resolve());
  const execute = vi.fn(() => Promise.resolve());
  const eventBus = { publish } as unknown as DomainEventPublisher;
  const commandBus = { execute } as unknown as CommandBus;
  const handler = new CompleteActionHandler(gameRepository, actorRoundRepository, actionRepository, eventBus, characterClient, commandBus);
  const run = (note?: string, defenseType?: 'dodge' | 'block') =>
    handler.execute(new CompleteActionCommand('action-1', note, 'user-1', [], defenseType));
  return { run, publish, execute, actorRound, updateActorRound };
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
    const { run } = setup('other', { freeAction: true });
    expect((await run()).actionPoints).toBe(0);
  });

  it('clears only the prone effects when standing up', async () => {
    const { run, execute } = setup('stand_up');
    await run();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(new DeleteEffectCommand('ar-1', 'e-1', 'user-1', []));
  });

  it('rejects standing up with fewer than 2 AP, or 1 with Acrobatics ranks (Table 8-1)', async () => {
    await expect(setup('stand_up', { phaseStart: 3 }).run()).rejects.toMatchObject({
      errorCode: 'err-stand-up-action-points',
    });
    await expect(setup('stand_up', { freeAction: true }).run()).rejects.toThrow('takes 2 action points');
    const acrobat = await setup('stand_up', { phaseStart: 3 }, { acrobaticsRanks: 2 }).run();
    expect(acrobat.actionPoints).toBe(1);
  });

  it('takes the 4 phases of the round with a dodge and sets the full dodge or block (§9.6)', async () => {
    const dodge = setup('dodge', { phaseStart: 1 });
    const result = await dodge.run();
    expect(result).toMatchObject({ phaseEnd: 4, actionPoints: 4, status: 'completed' });
    expect(dodge.actorRound.defenseMode).toEqual({ dodge: 'full', block: 'none' });
    expect(dodge.updateActorRound).toHaveBeenCalled();

    const block = setup('dodge', { phaseStart: 1 }, { shield: true });
    await block.run(undefined, 'block');
    expect(block.actorRound.defenseMode).toEqual({ dodge: 'none', block: 'full' });
  });

  it('rejects a dodge that cannot take the 4 AP, and a defence type on other actions', async () => {
    await expect(setup('dodge').run()).rejects.toMatchObject({ errorCode: 'err-full-defense-action-points' });
    await expect(setup('dodge', { phaseStart: 1 }).run(undefined, 'block')).rejects.toThrow('no shield');
    await expect(setup('other').run(undefined, 'dodge')).rejects.toThrow('only declared for dodge actions');
  });

  it('rejects actions that need a resolution and completed actions', async () => {
    await expect(setup('melee_attack').run()).rejects.toThrow('cannot be completed');
    await expect(setup('dodge', { status: 'completed' }).run()).rejects.toThrow('already completed');
  });
});
