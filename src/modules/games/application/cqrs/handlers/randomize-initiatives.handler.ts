import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeclareInitiativeCommand } from '../../../../actor-rounds/application/cqrs/commands/declare-initiative.command';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/out/character-round.repository';
import { NotFoundError } from '../../../../shared/domain/errors';
import { Game } from '../../../domain/entities/game.aggregate';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { RandomizeInitiativesCommand } from '../commands/randomize-intiatives.command';
import { StartRoundCommand } from '../commands/start-round.command';

@CommandHandler(RandomizeInitiativesCommand)
export class RandomizeInitiativesHandler implements ICommandHandler<RandomizeInitiativesCommand, Game> {
  private readonly logger = new Logger(RandomizeInitiativesHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('GameEventBus') private readonly gameEventBus: GameEventBusPort,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: StartRoundCommand): Promise<Game> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { gameId } = command;
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundError('Game', gameId);
    }
    const pendingActors = (await this.actorRoundRepository.findWithUndefinedInitiativeRoll(game.id, game.round)).filter(
      (ar) => !ar.isDead(),
    );
    const commands = pendingActors.map((ar) => {
      const random = this.random() + this.random();
      return new DeclareInitiativeCommand(ar.id, random, command.userId, command.roles);
    });
    await Promise.all(commands.map((c) => this.commandBus.execute(c)));
    return game;
  }

  private random(): number {
    return Math.floor(Math.random() * 10) + 1;
  }
}
