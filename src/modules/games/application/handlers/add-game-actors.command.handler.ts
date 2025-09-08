import { Inject, NotImplementedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError, NotModifiedError, ValidationError } from '../../../shared/domain/errors';
import * as cc from '../../../strategic/application/ports/out/character-client';
import { Actor, Game } from '../../domain/entities/game.aggregate';
import { AddGameActorsCommand } from '../commands/add-game-actors.command';
import { CreateGameCommandActor } from '../commands/create-game.command';
import * as gep from '../ports/game-event-bus.port';
import * as gr from '../ports/game.repository';

@CommandHandler(AddGameActorsCommand)
export class AddGameActorsCommandHandler implements ICommandHandler<AddGameActorsCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('CharacterClient') private readonly characterClient: cc.CharacterClient,
    @Inject('GameEventProducer') private readonly gameEventProducer: gep.GameEventBusPort,
  ) {}

  async execute(command: AddGameActorsCommand): Promise<Game> {
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
    if (mappedActors.length === 0) {
      throw new NotModifiedError('No new actors added');
    }
    game.actors.push(...mappedActors);
    const updated = await this.gameRepository.update(command.gameId, game);
    await this.gameEventProducer.updated(updated);
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
    return {
      id: character.id,
      name: character.name,
      factionId: character.factionId,
      type: actor.type,
      owner: character.owner,
    };
  }

  private mapNPC(actor: CreateGameCommandActor, game: Game): Promise<Actor> {
    throw new NotImplementedException('NPC mapping not implemented yet');
  }
}
