import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { LowerInitiativeCommand } from '../commands/lower-initiative.command.js';

/** §8.3 (workspace spec 083, decision 4): a combatant lowers its initiative during the action phases of the round. */
@CommandHandler(LowerInitiativeCommand)
export class LowerInitiativeHandler implements ICommandHandler<LowerInitiativeCommand, ActorRound> {
  private readonly logger = new Logger(LowerInitiativeHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: LowerInitiativeCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) throw new NotFoundError('Actor round', command.actorRoundId);
    const game = await this.gameRepository.findById(actorRound.gameId);
    if (!game) throw new NotFoundError('Game', actorRound.gameId);
    game.checkValidActionManagement();
    if (actorRound.round !== game.round) {
      throw new ValidationError('Only the initiative of the current round can be lowered', 'err-initiative-lower');
    }
    actorRound.lowerInitiative(command.total);
    return this.actorRoundRepository.update(actorRound);
  }
}
