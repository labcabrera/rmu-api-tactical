import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/actor-round.repository';
import { DeleteInjuryCommand } from '../commands/delete-injury.command';
import { UpdateInjuryCommand } from '../commands/update-injury.command';

const load = async (actorRoundRepository: ActorRoundRepository, gameRepository: GameRepository, id: string): Promise<ActorRound> => {
  const actorRound = await actorRoundRepository.findById(id);
  if (!actorRound) throw new NotFoundError('Actor round', id);
  (await gameRepository.findById(actorRound.gameId))?.checkNotFinished();
  return actorRound;
};

@CommandHandler(UpdateInjuryCommand)
export class UpdateInjuryHandler implements ICommandHandler<UpdateInjuryCommand, ActorRound> {
  private readonly logger = new Logger(UpdateInjuryHandler.name);

  constructor(
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: UpdateInjuryCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await load(this.actorRoundRepository, this.gameRepository, command.actorRoundId);
    actorRound.updateInjury(command.injuryId, command.patch);
    return this.actorRoundRepository.update(actorRound.id, actorRound);
  }
}

@CommandHandler(DeleteInjuryCommand)
export class DeleteInjuryHandler implements ICommandHandler<DeleteInjuryCommand, ActorRound> {
  private readonly logger = new Logger(DeleteInjuryHandler.name);

  constructor(
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: DeleteInjuryCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await load(this.actorRoundRepository, this.gameRepository, command.actorRoundId);
    actorRound.deleteInjury(command.injuryId);
    return this.actorRoundRepository.update(actorRound.id, actorRound);
  }
}
