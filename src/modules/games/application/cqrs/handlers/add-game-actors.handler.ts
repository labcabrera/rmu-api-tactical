import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { isCharacterNotAble, CHARACTER_PORT } from '../../../../strategic/application/ports/character.port.js';
import type { CharacterPort } from '../../../../strategic/application/ports/character.port.js';
import { Game } from '../../../domain/aggregates/game.js';
import { Actor } from '../../../domain/value-objects/actor.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { type NpcPort, NPC_PORT } from '../../ports/npc.port.js';
import { AddGameActorsCommand } from '../commands/add-game-actors.command.js';
import type { CreateGameCommandActor } from '../commands/create-game.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(AddGameActorsCommand)
export class AddGameActorsHandler implements ICommandHandler<AddGameActorsCommand, Game> {
  private readonly logger = new Logger(AddGameActorsHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(CHARACTER_PORT) private readonly characterClient: CharacterPort,
    @Inject(NPC_PORT) private readonly npcPort: NpcPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: AddGameActorsCommand): Promise<Game> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
    game.checkNotFinished();
    const mappedActors = await Promise.all(
      command.actors.map(async actor => {
        if (actor.type === 'character') {
          return await this.mapCharacter(actor, game);
        } else {
          return await this.mapNPC(actor, game);
        }
      }),
    );
    game.addActors(mappedActors);
    const updated = await this.gameRepository.update(command.gameId, game);
    const events = game.getUncommittedEvents();
    void this.eventPublisher.publish('game', ...events);
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

  private async mapNPC(actor: CreateGameCommandActor, game: Game): Promise<Actor> {
    const npc = await this.npcPort.findById(actor.id);
    if (!npc) {
      throw new NotFoundError('Actor', actor.id);
    }
    if (!actor.factionId) {
      throw new ValidationError('NPC actor must have a faction');
    }
    //TODO check realm and faction
    return Actor.fromProps({
      id: npc.id,
      name: npc.name,
      faction: {
        id: actor.factionId,
        name: 'TODO: undefined-faction',
      },
      type: actor.type,
      owner: game.owner,
    });
  }
}
