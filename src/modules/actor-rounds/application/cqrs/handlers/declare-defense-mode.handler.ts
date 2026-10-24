import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { DeclareDefenseModeCommand } from '../commands/declare-defense-mode.command.js';

@CommandHandler(DeclareDefenseModeCommand)
export class DeclareDefenseModeHandler implements ICommandHandler<DeclareDefenseModeCommand, ActorRound> {
  private readonly logger = new Logger(DeclareDefenseModeHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: DeclareDefenseModeCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);

    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) throw new NotFoundError('Actor round', command.actorRoundId);
    (await this.gameRepository.findById(actorRound.gameId))?.checkNotFinished();

    actorRound.setDefenseMode(command.dodge, command.block);
    return await this.actorRoundRepository.update(actorRound);
  }
}
