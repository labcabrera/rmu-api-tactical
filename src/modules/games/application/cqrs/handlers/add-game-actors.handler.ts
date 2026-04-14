import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import type { CharacterPort } from '../../../../strategic/application/ports/character.port';
import { Game } from '../../../domain/aggregates/game.aggregate';
import { Actor } from '../../../domain/value-objects/actor.vo';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import type { NpcPort } from '../../ports/npc.port';
import { AddGameActorsCommand } from '../commands/add-game-actors.command';
import type { CreateGameCommandActor } from '../commands/create-game.command';

@CommandHandler(AddGameActorsCommand)
export class AddGameActorsHandler implements ICommandHandler<AddGameActorsCommand, Game> {
  private readonly logger = new Logger(AddGameActorsHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('CharacterClient') private readonly characterClient: CharacterPort,
    @Inject('NpcPort') private readonly npcPort: NpcPort,
    @Inject('GameEventBus') private readonly gameEventBus: GameEventBusPort,
  ) {}

  async execute(command: AddGameActorsCommand): Promise<Game> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
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
    events.forEach(event => this.gameEventBus.publish(event));
    return updated;
  }

  private async mapCharacter(actor: CreateGameCommandActor, game: Game): Promise<Actor> {
    const character = await this.characterClient.findById(actor.id);
    if (!character) {
      throw new NotFoundError('Actor', actor.id);
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
