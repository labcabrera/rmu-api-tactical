import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as crr from '../../../actor-rounds/application/ports/out/character-round.repository';
import { ActorRoundService } from '../../../actor-rounds/application/services/actor-round-service';
import { NotFoundError } from '../../../shared/domain/errors';
import * as cr from '../../../strategic/application/ports/out/character-client';
import { Game } from '../../domain/entities/game.aggregate';
import { StartRoundCommand } from '../cqrs/commands/start-round.command';
import * as gep from '../ports/game-event-bus.port';
import * as gr from '../ports/game.repository';

@CommandHandler(StartRoundCommand)
export class StartRoundCommandHandler implements ICommandHandler<StartRoundCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('ActorRoundRepository') private readonly characterRoundRepository: crr.ActorRoundRepository,
    @Inject('CharacterClient') private readonly characterClient: cr.CharacterClient,
    @Inject('GameEventProducer') private readonly eventBus: gep.GameEventBusPort,
    @Inject() private readonly actorRoundService: ActorRoundService,
  ) {}

  async execute(command: StartRoundCommand): Promise<Game> {
    const { gameId } = command;
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundError('Game', gameId);
    }
    game.startRound();
    const updatedGame = await this.gameRepository.update(gameId, game);
    await this.createCharacterRounds(updatedGame);
    const events = game.pullDomainEvents();
    events.forEach((event) => this.eventBus.publish(event));
    return updatedGame;
  }

  private async createCharacterRounds(game: Game): Promise<void> {
    await Promise.all(game.actors.map((actor) => this.actorRoundService.create(game.id, actor, game.round)));
  }
}
