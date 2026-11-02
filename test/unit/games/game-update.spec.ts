import { describe, expect, it, vi } from 'vitest';
import { UpdateGameCommand } from '../../../src/modules/games/application/cqrs/commands/update-game.command.js';
import { UpdateGameHandler } from '../../../src/modules/games/application/cqrs/handlers/update-game.handler.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import { Game } from '../../../src/modules/games/domain/aggregates/game.js';
import { GameEnvironment } from '../../../src/modules/games/domain/value-objects/game-environment.vo.js';

/** A game as the repository loads it: with its version, so it has the snapshot hasChanges() compares with. */
const loaded = () =>
  Game.fromProps({
    id: 'game-1',
    strategicGameId: 'sg-1',
    name: 'Moria',
    description: 'Bridge',
    status: 'created',
    round: 0,
    phase: 'not_started',
    factions: ['f1'],
    actors: [],
    environment: new GameEnvironment(-5, -10),
    owner: 'gm',
    createdAt: new Date('2026-01-01'),
  }).restoreVersion(3);

const handlerWith = (game: Game) => {
  const repository = { findById: vi.fn(() => Promise.resolve(game)), update: vi.fn((g: Game) => Promise.resolve(g)) };
  const publisher = { publish: vi.fn(() => Promise.resolve()) };
  const handler = new UpdateGameHandler(repository as unknown as GameRepository, publisher);
  return { handler, repository, publisher };
};

const command = (name?: string, environment?: GameEnvironment, description?: string) =>
  new UpdateGameCommand('game-1', name, environment, description, undefined, 'gm', [], undefined);

describe('BaseAggregateRoot.hasChanges', () => {
  it('is true for an aggregate that was never stored', () => {
    const game = Game.create('sg-1', 'Moria', [], [], undefined, undefined, undefined, 'gm');
    expect(game.hasChanges()).toBe(true);
  });

  it('compares with the state loaded, leaving out updatedAt', () => {
    const game = loaded();
    expect(game.hasChanges()).toBe(false);
    game.updatedAt = new Date();
    expect(game.hasChanges()).toBe(false);
    game.name = 'Moria II';
    expect(game.hasChanges()).toBe(true);
  });

  it('takes a new snapshot when the version is restored after a write', () => {
    const game = loaded();
    game.name = 'Moria II';
    game.restoreVersion(4);
    expect(game.hasChanges()).toBe(false);
  });
});

// Spec 021, decision 9 [F-receta-23]: the no-op detection of the game is the one of the base aggregate.
describe('UpdateGameHandler', () => {
  it('neither writes nor publishes a change that changes nothing, also the same environment', async () => {
    const game = loaded();
    const { handler, repository, publisher } = handlerWith(game);

    const result = await handler.execute(command('Moria', new GameEnvironment(-5, -10), 'Bridge'));

    expect(result).toBe(game);
    expect(repository.update).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
    expect(game.getUncommittedEvents()).toEqual([]);
  });

  it('writes and publishes a change of the environment, and clears the events it published [F-tactical-10]', async () => {
    const game = loaded();
    const { handler, repository, publisher } = handlerWith(game);

    await handler.execute(command(undefined, new GameEnvironment(-5, -20)));

    expect(repository.update).toHaveBeenCalledOnce();
    expect(publisher.publish).toHaveBeenCalledWith('game', expect.objectContaining({ eventType: 'updated' }));
    expect(game.getUncommittedEvents()).toEqual([]);
  });
});
