import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ValidationError } from '../../../../shared/domain/errors';
import type { CharacterPort } from '../../../../strategic/application/ports/character.port';
import type { StrategicGamePort } from '../../../../strategic/application/ports/strategic-game.port';
import { Game } from '../../../domain/aggregates/game.aggregate';
import { Actor } from '../../../domain/value-objects/actor.vo';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import type { NpcPort } from '../../ports/npc.port';
import { CreateGameCommand, CreateGameCommandActor } from '../commands/create-game.command';

@CommandHandler(CreateGameCommand)
export class CreateGameHandler implements ICommandHandler<CreateGameCommand, Game> {
  private readonly logger = new Logger(CreateGameHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('StrategicGameClient') private readonly strategicGameClient: StrategicGamePort,
    @Inject('CharacterClient') private readonly characterClient: CharacterPort,
    @Inject('NpcPort') private readonly npcPort: NpcPort,
    @Inject('GameEventBus') private readonly gameEventBus: GameEventBusPort,
  ) {}

  async execute(command: CreateGameCommand): Promise<Game> {
    this.logger.debug(`Execute << ${command.name} for user ${command.userId}`);
    const strategicGame = await this.strategicGameClient.findById(command.strategicGameId);
    if (!strategicGame) {
      throw new ValidationError(`Strategic game ${command.strategicGameId} not found`);
    }
    const actors = await (command.actors
      ? Promise.all(command.actors.map((actor) => this.mapActor(actor, command.userId)))
      : undefined);
    const game = Game.create(
      command.strategicGameId,
      command.name,
      command.factions,
      actors,
      command.description,
      command.userId,
    );
    const saved = await this.gameRepository.save(game);
    const events = game.getUncommittedEvents();
    events.forEach((event) => this.gameEventBus.publish(event));
    return saved;
  }

  private async mapActor(actor: CreateGameCommandActor, userId: string): Promise<Actor> {
    if (actor.type === 'character') {
      const character = await this.characterClient.findById(actor.id);
      if (!character) {
        throw new ValidationError(`Character ${actor.id} not found`);
      }
      return Actor.fromProps({
        id: actor.id,
        name: character.name,
        faction: character.faction,
        type: actor.type,
        owner: character.owner,
      });
    } else {
      const npc = await this.npcPort.findById(actor.id);
      if (!npc) {
        throw new ValidationError(`NPC ${actor.id} not found`);
      }
      return Actor.fromProps({
        id: actor.id,
        name: npc.name,
        faction: {
          id: actor.factionId!,
          name: 'TODO: undefined-faction',
        },
        type: actor.type,
        owner: userId,
      });
    }
  }
}
