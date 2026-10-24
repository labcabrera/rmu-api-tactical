import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port';
import { UpdateInjuryCommand } from '../commands/update-injury.command';

/** Loads the actor round of an injury change and checks that its game is not finished. */
export const loadActorRoundOfInjury = async (
  actorRoundRepository: ActorRoundRepository,
  gameRepository: GameRepository,
  id: string,
): Promise<ActorRound> => {
  const actorRound = await actorRoundRepository.findById(id);
  if (!actorRound) throw new NotFoundError('Actor round', id);
  (await gameRepository.findById(actorRound.gameId))?.checkNotFinished();
  return actorRound;
};

@CommandHandler(UpdateInjuryCommand)
export class UpdateInjuryHandler implements ICommandHandler<UpdateInjuryCommand, ActorRound> {
  private readonly logger = new Logger(UpdateInjuryHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: UpdateInjuryCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await loadActorRoundOfInjury(this.actorRoundRepository, this.gameRepository, command.actorRoundId);
    actorRound.updateInjury(command.injuryId, command.patch);
    return this.actorRoundRepository.update(actorRound.id, actorRound);
  }
}
