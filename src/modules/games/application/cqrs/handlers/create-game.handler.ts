import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type CharacterPort, CHARACTER_PORT } from '../../../../strategic/application/ports/character.port.js';
import { type StrategicGamePort, STRATEGIC_GAME_PORT } from '../../../../strategic/application/ports/strategic-game.port.js';
import { Game } from '../../../domain/aggregates/game.js';
import { Actor } from '../../../domain/value-objects/actor.vo.js';
import { ENVIRONMENT_FACTION_ID, EnvironmentFactions } from '../../../domain/value-objects/environment-faction.vo.js';
import { GameEnvironment } from '../../../domain/value-objects/game-environment.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { GameNpcsService } from '../../services/game-npcs.service.js';
import { CreateGameCommand, CreateGameCommandActor, type GameNpcRequest } from '../commands/create-game.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(CreateGameCommand)
export class CreateGameHandler implements ICommandHandler<CreateGameCommand, Game> {
  private readonly logger = new Logger(CreateGameHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(STRATEGIC_GAME_PORT) private readonly strategicGameClient: StrategicGamePort,
    @Inject(CHARACTER_PORT) private readonly characterClient: CharacterPort,
    private readonly gameNpcs: GameNpcsService,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: CreateGameCommand): Promise<Game> {
    this.logger.debug(`Execute << ${command.name} for user ${command.userId}`);
    const strategicGame = await this.strategicGameClient.findById(command.strategicGameId);
    if (!strategicGame) {
      throw new ValidationError(`Strategic game ${command.strategicGameId} not found`);
    }
    const factions = command.factions || [];
    if (factions.includes(ENVIRONMENT_FACTION_ID)) {
      throw new ValidationError(`Faction ${ENVIRONMENT_FACTION_ID} is reserved for the environment`, 'err-environment-faction-reserved');
    }
    const characters = await Promise.all(
      (command.actors || []).filter(actor => actor.type === 'character').map(actor => this.mapCharacter(actor)),
    );
    // Spec 055: one actor per specimen, from the NPCs of the factions, the ones requested and the environment ones.
    const environmentName = EnvironmentFactions.create(command.environmentFaction?.name).name;
    const requests: GameNpcRequest[] = [
      ...GameNpcsService.legacyRequests(command.actors),
      ...(command.npcs || []),
      ...(command.environmentFaction?.npcs || []).map(npc => ({ ...npc, factionId: ENVIRONMENT_FACTION_ID })),
    ];
    const { actors: npcActors, environmentNpcs } = await this.gameNpcs.toActors(
      {
        strategicGameId: command.strategicGameId,
        realmId: strategicGame.realmId,
        gameOwner: command.userId,
        factionIds: factions,
        environmentName,
        takenNames: characters.map(character => character.name),
      },
      requests,
      command.includeFactionNpcs === false ? [] : factions,
    );
    const environmentFaction =
      command.environmentFaction || environmentNpcs.length > 0 ? EnvironmentFactions.create(environmentName, environmentNpcs) : null;
    const environment = command.environment
      ? new GameEnvironment(command.environment.temperatureFatigueModifier, command.environment.altitudeFatigueModifier)
      : undefined;

    const game = Game.create(
      command.strategicGameId,
      command.name,
      [...factions],
      [...characters, ...npcActors],
      environment,
      command.description,
      command.imageUrl,
      command.userId,
      strategicGame.owner,
      strategicGame.accessType,
      environmentFaction,
    );
    const saved = await this.gameRepository.save(game);
    const events = game.getUncommittedEvents();
    void this.eventPublisher.publish('game', ...events);
    // The events are handed over: clear them, so a later write of the same aggregate does not publish them again.
    game.commit();
    return saved;
  }

  private async mapCharacter(actor: CreateGameCommandActor): Promise<Actor> {
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
  }
}
