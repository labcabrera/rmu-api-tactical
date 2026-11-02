import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { isCharacterNotAble, CHARACTER_PORT } from '../../../../strategic/application/ports/character.port.js';
import type { CharacterPort } from '../../../../strategic/application/ports/character.port.js';
import { type StrategicGamePort, STRATEGIC_GAME_PORT } from '../../../../strategic/application/ports/strategic-game.port.js';
import { Game } from '../../../domain/aggregates/game.js';
import { Actor } from '../../../domain/value-objects/actor.vo.js';
import { DEFAULT_ENVIRONMENT_NAME, type GameNpc } from '../../../domain/value-objects/environment-faction.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { GameNpcsService } from '../../services/game-npcs.service.js';
import { AddGameActorsCommand } from '../commands/add-game-actors.command.js';
import type { CreateGameCommandActor, GameNpcRequest } from '../commands/create-game.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(AddGameActorsCommand)
export class AddGameActorsHandler implements ICommandHandler<AddGameActorsCommand, Game> {
  private readonly logger = new Logger(AddGameActorsHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(CHARACTER_PORT) private readonly characterClient: CharacterPort,
    @Inject(STRATEGIC_GAME_PORT) private readonly strategicGameClient: StrategicGamePort,
    private readonly gameNpcs: GameNpcsService,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: AddGameActorsCommand): Promise<Game> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
    game.checkNotFinished();
    const actors = command.actors || [];
    const characters = await Promise.all(actors.filter(actor => actor.type === 'character').map(actor => this.mapCharacter(actor, game)));
    const requests: GameNpcRequest[] = [...GameNpcsService.legacyRequests(actors), ...command.npcs];
    let npcActors: Actor[] = [];
    let environmentNpcs: GameNpc[] = [];
    if (requests.length > 0) {
      // Spec 055: NPC specimens join only while the game is being set up.
      if (game.status !== 'created') {
        throw new ValidationError('NPCs can only be added to a game in created status', 'err-game-not-created');
      }
      const strategicGame = await this.strategicGameClient.findById(game.strategicGameId);
      if (!strategicGame) {
        throw new ValidationError(`Strategic game ${game.strategicGameId} not found`);
      }
      ({ actors: npcActors, environmentNpcs } = await this.gameNpcs.toActors(
        {
          strategicGameId: game.strategicGameId,
          realmId: strategicGame.realmId,
          gameOwner: game.owner,
          factionIds: game.factions,
          environmentName: game.environmentFaction?.name ?? DEFAULT_ENVIRONMENT_NAME,
          takenNames: [...game.actors, ...characters].map(actor => actor.name),
        },
        requests,
      ));
    }
    game.addActors([...characters, ...npcActors], environmentNpcs);
    const updated = await this.gameRepository.update(game);
    const events = game.getUncommittedEvents();
    void this.eventPublisher.publish('game', ...events);
    // The events are handed over: clear them, so a later write of the same aggregate does not publish them again.
    game.commit();
    return updated;
  }

  private async mapCharacter(actor: CreateGameCommandActor, game: Game): Promise<Actor> {
    const character = await this.characterClient.findById(actor.id);
    if (!character) {
      throw new NotFoundError('Actor', actor.id);
    }
    if (isCharacterNotAble(character)) {
      throw new ValidationError(`Character ${character.id} is dead or permanently unconscious`, 'err-character-not-able');
    }
    if (!game.factions.includes(character.faction.id)) {
      throw new ValidationError('Actor is not part of the game factions');
    }
    if (game.actors.some(a => a.id === character.id)) {
      throw new ValidationError('Actor is already part of the game');
    }
    return Actor.fromProps({
      id: character.id,
      name: character.name,
      faction: character.faction,
      type: actor.type,
      owner: character.owner,
    });
  }
}
