import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UnprocessableEntityError } from '../../../../shared/domain/errors/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port';
import { AddFatigueCommand } from '../commands/add-fatigue.command';

@CommandHandler(AddFatigueCommand)
export class AddFatigueHandler implements ICommandHandler<AddFatigueCommand, ActorRound> {
  private readonly logger = new Logger(AddFatigueHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: AddFatigueCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);

    let actorRound: ActorRound | null = null;
    if (command.actorRoundId) {
      actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    } else if (command.gameId && command.actorId && command.round !== undefined) {
      actorRound = await this.actorRoundRepository.findByActorIdAndRound(command.gameId, command.actorId, command.round);
    }

    if (!actorRound) throw new UnprocessableEntityError(`Actor round not found`);
    (await this.gameRepository.findById(actorRound.gameId))?.checkNotFinished();

    actorRound.addFatigue(command.fatigue);

    const updated = await this.actorRoundRepository.update(actorRound.id, actorRound);
    //TODO notify event bus
    return updated;
  }
}
