import { Inject, Logger, NotImplementedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { ValidationError } from '../../../../shared/domain/errors';
import * as cc from '../../../../strategic/application/ports/out/character-client';
import * as sgc from '../../../../strategic/application/ports/out/strategic-game-client';
import { Actor, Game } from '../../../domain/entities/game.entity';
import * as gep from '../../ports/out/game-event-producer';
import * as gr from '../../ports/out/game.repository';
import { CreateGameCommand, CreateGameCommandActor } from '../create-game.command';

@CommandHandler(CreateGameCommand)
export class CreateGameCommandHandler implements ICommandHandler<CreateGameCommand, Game> {
  private readonly logger = new Logger(CreateGameCommandHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('StrategicGameClient') private readonly strategicGameClient: sgc.StrategicGameClient,
    @Inject('CharacterClient') private readonly characterClient: cc.CharacterClient,
    @Inject('GameEventProducer') private readonly gameEventProducer: gep.GameEventProducer,
  ) {}

  async execute(command: CreateGameCommand): Promise<Game> {
    this.logger.debug(`Creating game: ${command.name} for user ${command.userId}`);
    const strategicGame = await this.strategicGameClient.findById(command.strategicGameId);
    if (!strategicGame) {
      throw new ValidationError(`Strategic game ${command.strategicGameId} not found`);
    }
    //TODO validate actor factions
    const factions = command.factions || [];
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
      factions: factions,
      actors: actors,
      description: command.description,
      owner: strategicGame.owner,
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
    let owner = 'unknown';
    if (actor.type === 'character') {
      const character = await this.characterClient.findById(actor.id);
      if (!character) {
        throw new ValidationError(`Character ${actor.id} not found`);
      }
      name = character.name;
      factionId = character.factionId;
      owner = character.owner;
    } else {
      //TODO
      throw new NotImplementedException('NPCs are not implemented');
    }
    return {
      id: actor.id,
      name: name,
      type: actor.type,
      factionId: factionId,
      owner: owner,
    };
  }
}
