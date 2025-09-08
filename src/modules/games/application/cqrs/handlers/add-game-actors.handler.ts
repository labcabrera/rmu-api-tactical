import { Inject, Logger, NotImplementedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import type { CharacterClient } from '../../../../strategic/application/ports/out/character-client';
import { Actor } from '../../../domain/entities/actor.vo';
import { Game } from '../../../domain/entities/game.aggregate';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { AddGameActorsCommand } from '../commands/add-game-actors.command';
import type { CreateGameCommandActor } from '../commands/create-game.command';

@CommandHandler(AddGameActorsCommand)
export class AddGameActorsHandler implements ICommandHandler<AddGameActorsCommand, Game> {
  private readonly logger = new Logger(AddGameActorsHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('CharacterClient') private readonly characterClient: CharacterClient,
    @Inject('GameEventProducer') private readonly gameEventBus: GameEventBusPort,
  ) {}

  async execute(command: AddGameActorsCommand): Promise<Game> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
    const mappedActors = await Promise.all(
      command.actors.map(async (actor) => {
        if (actor.type === 'character') {
          return await this.mapCharacter(actor, game);
        } else {
          return await this.mapNPC(actor, game);
        }
      }),
    );
    game.addActors(mappedActors);
    const updated = await this.gameRepository.update(command.gameId, game);
    const events = game.pullDomainEvents();
    events.forEach((event) => this.gameEventBus.publish(event));
    return updated;
  }

  private async mapCharacter(actor: CreateGameCommandActor, game: Game): Promise<Actor> {
    const character = await this.characterClient.findById(actor.id);
    if (!character) {
      throw new NotFoundError('Actor', actor.id);
    }
    if (!game.factions.includes(character.factionId)) {
      throw new ValidationError('Actor is not part of the game factions');
    }
    if (game.actors.some((a) => a.id === character.id)) {
      throw new ValidationError('Actor is already part of the game');
    }
    return new Actor(character.id, character.name, character.factionId, actor.type, character.owner);
  }

  private mapNPC(actor: CreateGameCommandActor, game: Game): Promise<Actor> {
    throw new NotImplementedException('NPC mapping not implemented yet');
  }
}
