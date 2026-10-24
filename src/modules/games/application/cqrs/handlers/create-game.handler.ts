import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type CharacterPort, CHARACTER_PORT } from '../../../../strategic/application/ports/character.port.js';
import { type StrategicGamePort, STRATEGIC_GAME_PORT } from '../../../../strategic/application/ports/strategic-game.port.js';
import { Game } from '../../../domain/aggregates/game.js';
import { Actor } from '../../../domain/value-objects/actor.vo.js';
import { GameEnvironment } from '../../../domain/value-objects/game-environment.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { type NpcPort, NPC_PORT } from '../../ports/npc.port.js';
import { CreateGameCommand, CreateGameCommandActor } from '../commands/create-game.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(CreateGameCommand)
export class CreateGameHandler implements ICommandHandler<CreateGameCommand, Game> {
  private readonly logger = new Logger(CreateGameHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(STRATEGIC_GAME_PORT) private readonly strategicGameClient: StrategicGamePort,
    @Inject(CHARACTER_PORT) private readonly characterClient: CharacterPort,
    @Inject(NPC_PORT) private readonly npcPort: NpcPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: CreateGameCommand): Promise<Game> {
    this.logger.debug(`Execute << ${command.name} for user ${command.userId}`);
    const strategicGame = await this.strategicGameClient.findById(command.strategicGameId);
    if (!strategicGame) {
      throw new ValidationError(`Strategic game ${command.strategicGameId} not found`);
    }
    const actors = await (command.actors ? Promise.all(command.actors.map(actor => this.mapActor(actor, command.userId))) : undefined);
    const environment = command.environment
      ? new GameEnvironment(command.environment.temperatureFatigueModifier, command.environment.altitudeFatigueModifier)
      : undefined;

    const game = Game.create(
      command.strategicGameId,
      command.name,
      command.factions,
      actors,
      environment,
      command.description,
      command.imageUrl,
      command.userId,
    );
    const saved = await this.gameRepository.save(game);
    const events = game.getUncommittedEvents();
    void this.eventPublisher.publish('game', ...events);
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
