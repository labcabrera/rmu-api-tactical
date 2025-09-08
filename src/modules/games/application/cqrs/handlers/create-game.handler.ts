import { Inject, Logger, NotImplementedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ValidationError } from '../../../../shared/domain/errors';
import type { CharacterClient } from '../../../../strategic/application/ports/out/character-client';
import type { StrategicGameClient } from '../../../../strategic/application/ports/out/strategic-game-client';
import { Actor } from '../../../domain/entities/actor.vo';
import { Game } from '../../../domain/entities/game.aggregate';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { CreateGameCommand, CreateGameCommandActor } from '../commands/create-game.command';

@CommandHandler(CreateGameCommand)
export class CreateGameHandler implements ICommandHandler<CreateGameCommand, Game> {
  private readonly logger = new Logger(CreateGameHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('StrategicGameClient') private readonly strategicGameClient: StrategicGameClient,
    @Inject('CharacterClient') private readonly characterClient: CharacterClient,
    @Inject('GameEventProducer') private readonly bus: GameEventBusPort,
  ) {}

  async execute(command: CreateGameCommand): Promise<Game> {
    this.logger.debug(`Creating game: ${command.name} for user ${command.userId}`);
    const strategicGame = await this.strategicGameClient.findById(command.strategicGameId);
    if (!strategicGame) {
      throw new ValidationError(`Strategic game ${command.strategicGameId} not found`);
    }
    const actors = await (command.actors ? Promise.all(command.actors.map((actor) => this.mapActor(actor))) : undefined);
    const game = Game.create(command.strategicGameId, command.name, command.factions, actors, command.description, command.userId);
    const savedGame = await this.gameRepository.save(game);
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
    return new Actor(actor.id, name, factionId, actor.type, owner);
  }
}
