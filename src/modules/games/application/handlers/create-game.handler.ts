import { Inject, Logger, NotImplementedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { ValidationError } from '../../../shared/domain/errors';
import * as cc from '../../../strategic/application/ports/out/character-client';
import * as sgc from '../../../strategic/application/ports/out/strategic-game-client';
import { Actor } from '../../domain/entities/actor.vo';
import { Game } from '../../domain/entities/game.aggregate';
import { CreateGameCommand, CreateGameCommandActor } from '../cqrs/commands/create-game.command';
import * as gep from '../ports/game-event-bus.port';
import * as gr from '../ports/game.repository';

@CommandHandler(CreateGameCommand)
export class CreateGameCommandHandler implements ICommandHandler<CreateGameCommand, Game> {
  private readonly logger = new Logger(CreateGameCommandHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('StrategicGameClient') private readonly strategicGameClient: sgc.StrategicGameClient,
    @Inject('CharacterClient') private readonly characterClient: cc.CharacterClient,
    @Inject('GameEventProducer') private readonly bus: gep.GameEventBusPort,
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
    const newGame = new Game(
      randomUUID(),
      command.strategicGameId,
      command.name,
      'created',
      0,
      'not_started',
      factions,
      actors,
      command.description,
      strategicGame.owner,
      new Date(),
      undefined,
    );
    const savedGame = await this.gameRepository.save(newGame);
    await this.bus.created(savedGame);
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
