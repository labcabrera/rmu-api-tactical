import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port';
import { DeleteEffectCommand } from '../commands/delete-effect.command';

@CommandHandler(DeleteEffectCommand)
export class DeleteEffectHandler implements ICommandHandler<DeleteEffectCommand, ActorRound> {
  private readonly logger = new Logger(DeleteEffectHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: DeleteEffectCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);

    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) throw new NotFoundError('Actor round', command.actorRoundId);
    (await this.gameRepository.findById(actorRound.gameId))?.checkNotFinished();

    actorRound.deleteEffect(command.effectId);
    const updated = await this.actorRoundRepository.update(actorRound.id, actorRound);
    //TODO notify event bus
    return updated;
  }
}
