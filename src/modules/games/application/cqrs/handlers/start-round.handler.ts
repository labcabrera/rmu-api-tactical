import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateActorRoundCommand } from '../../../../actor-rounds/application/cqrs/commands/create-actor-round.command';
import { UpkeepActorRoundCommand } from '../../../../actor-rounds/application/cqrs/commands/upkeep-actor-round.command';
import { NotFoundError } from '../../../../shared/domain/errors';
import { Actor } from '../../../domain/entities/actor.vo';
import { Game } from '../../../domain/entities/game.aggregate';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { StartRoundCommand } from '../commands/start-round.command';

@CommandHandler(StartRoundCommand)
export class StartRoundHandler implements ICommandHandler<StartRoundCommand, Game> {
  private readonly logger = new Logger(StartRoundHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('GameEventBus') private readonly gameEventBus: GameEventBusPort,
    private commandBus: CommandBus,
  ) {}

  async execute(command: StartRoundCommand): Promise<Game> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { gameId } = command;
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundError('Game', gameId);
    }
    //TODO make saga
    if (game.round > 0) {
      await Promise.all(game.actors.map((actor) => this.applyUpkeepToActorRounds(actor, game.round, command.userId, command.roles)));
    }
    await Promise.all(game.actors.map((actor) => this.createActorRounds(game.id, game.round + 1, actor)));
    game.startRound();
    const updatedGame = await this.gameRepository.update(gameId, game);
    const events = game.pullDomainEvents();
    events.forEach((event) => this.gameEventBus.publish(event));
    return updatedGame;
  }

  private async createActorRounds(gameId: string, round: number, actor: Actor): Promise<void> {
    const command = new CreateActorRoundCommand(gameId, actor, round);
    await this.commandBus.execute(command);
  }

  private async applyUpkeepToActorRounds(actor: Actor, round: number, userId: string, roles: string[]): Promise<void> {
    const command = new UpkeepActorRoundCommand(actor.id, round, userId, roles);
    await this.commandBus.execute(command);
  }
}
