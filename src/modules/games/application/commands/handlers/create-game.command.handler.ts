import { Inject, Logger, NotImplementedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { ValidationError } from '../../../../shared/domain/errors';
import * as cc from '../../../../strategic/application/ports/out/character-client';
import { Actor, Game } from '../../../domain/entities/game.entity';
import * as gep from '../../ports/out/game-event-producer';
import * as gr from '../../ports/out/game.repository';
import { CreateGameCommand, CreateGameCommandActor } from '../create-game.command';

@CommandHandler(CreateGameCommand)
export class CreateGameCommandHandler implements ICommandHandler<CreateGameCommand, Game> {
  private readonly logger = new Logger(CreateGameCommandHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('CharacterClient') private readonly characterClient: cc.CharacterClient,
    @Inject('GameEventProducer') private readonly gameEventProducer: gep.GameEventProducer,
  ) {}

  async execute(command: CreateGameCommand): Promise<Game> {
    this.logger.debug(`Creating game: ${command.name} for user ${command.userId}`);
    const actors: Actor[] = [];
    if (command.actors) {
      for (const actorCommand of command.actors) {
        const actor = await this.mapActor(actorCommand);
        actors.push(actor);
      }
    }
    const newGame: Omit<Game, 'id'> = {
      strategicGameId: command.strategicGameId,
      name: command.name,
      status: 'created',
      phase: 'not_started',
      round: 0,
      actors: actors,
      description: command.description,
      owner: command.userId,
      createdAt: new Date(),
      updatedAt: undefined,
    };
    const savedGame = await this.gameRepository.save(newGame);
    await this.gameEventProducer.created(savedGame);
    return savedGame;
  }

  private async mapActor(actor: CreateGameCommandActor): Promise<Actor> {
    let name = 'unknown';
    let factionId = actor.faction || 'neutral';
    if (actor.type === 'character') {
      const character = await this.characterClient.findById(actor.id);
      if (!character) {
        throw new ValidationError(`Character ${actor.id} not found`);
      }
      name = character.name;
      factionId = character.factionId;
    } else {
      //TODO
      throw new NotImplementedException('NPCs are not implemented');
    }
    return {
      id: actor.id,
      name: name,
      type: actor.type,
      factionId: factionId,
    };
  }
}
