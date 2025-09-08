import { Inject, Logger, NotImplementedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ValidationError } from '../../../../shared/domain/errors';
import type { CharacterPort } from '../../../../strategic/application/ports/character.port';
import type { StrategicGamePort } from '../../../../strategic/application/ports/strategic-game.port';
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
    @Inject('StrategicGameClient') private readonly strategicGameClient: StrategicGamePort,
    @Inject('CharacterClient') private readonly characterClient: CharacterPort,
    @Inject('GameEventBus') private readonly gameEventBus: GameEventBusPort,
  ) {}

  async execute(command: CreateGameCommand): Promise<Game> {
    this.logger.debug(`Execute << ${command.name} for user ${command.userId}`);
    const strategicGame = await this.strategicGameClient.findById(command.strategicGameId);
    if (!strategicGame) {
      throw new ValidationError(`Strategic game ${command.strategicGameId} not found`);
    }
    const actors = await (command.actors ? Promise.all(command.actors.map((actor) => this.mapActor(actor))) : undefined);
    const game = Game.create(command.strategicGameId, command.name, command.factions, actors, command.description, command.userId);
    const saved = await this.gameRepository.save(game);
    const events = game.pullDomainEvents();
    events.forEach((event) => this.gameEventBus.publish(event));
    return saved;
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
