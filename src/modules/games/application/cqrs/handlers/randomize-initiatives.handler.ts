import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { DeclareInitiativeCommand } from '../../../../actor-rounds/application/cqrs/commands/declare-initiative.command.js';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { Game } from '../../../domain/aggregates/game.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { RandomizeInitiativesCommand } from '../commands/randomize-initiatives.command.js';
import { StartRoundCommand } from '../commands/start-round.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(RandomizeInitiativesCommand)
export class RandomizeInitiativesHandler implements ICommandHandler<RandomizeInitiativesCommand, Game> {
  private readonly logger = new Logger(RandomizeInitiativesHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: StartRoundCommand): Promise<Game> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { gameId } = command;
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundError('Game', gameId);
    }
    game.checkNotFinished();
    // Flatfooted actors don't roll initiative (§8.3 Surprise); the penalties are applied when it is declared.
    const pendingActors = (await this.actorRoundRepository.findWithUndefinedInitiativeRoll(game.id, game.round)).filter(
      ar => !ar.isDead() && !ar.hasEffect('flatfooted'),
    );
    const commands = pendingActors.map(ar => {
      const random = this.random() + this.random();
      return new DeclareInitiativeCommand(ar.id, random, command.userId, command.roles);
    });
    await Promise.all(commands.map(c => this.commandBus.execute(c)));
    return game;
  }

  private random(): number {
    return Math.floor(Math.random() * 10) + 1;
  }
}
