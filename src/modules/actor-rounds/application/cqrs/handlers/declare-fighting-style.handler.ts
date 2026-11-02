import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { evaluateActiveStyle } from '../../../domain/services/fighting-style-evaluator.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { type FightingStylesPort, FIGHTING_STYLES_PORT } from '../../ports/fighting-styles.port.js';
import { DeclareFightingStyleCommand } from '../commands/declare-fighting-style.command.js';

/** Declares the fighting style of the actor, checked against its equipment with the catalog of rmu-api-core. */
@CommandHandler(DeclareFightingStyleCommand)
export class DeclareFightingStyleHandler implements ICommandHandler<DeclareFightingStyleCommand, ActorRound> {
  private readonly logger = new Logger(DeclareFightingStyleHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(FIGHTING_STYLES_PORT) private readonly fightingStyles: FightingStylesPort,
  ) {}

  async execute(command: DeclareFightingStyleCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);

    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) throw new NotFoundError('Actor round', command.actorRoundId);
    (await this.gameRepository.findById(actorRound.gameId))?.checkNotFinished();

    if (!command.skillId || !command.styleId) {
      actorRound.setActiveStyle(null);
      return await this.actorRoundRepository.update(actorRound);
    }
    const style = actorRound.fightingStyles.find(each => each.skillId === command.skillId && each.styleId === command.styleId);
    if (!style) {
      throw new ValidationError(`The actor has no ranks in the fighting style ${command.styleId}`, 'err-fighting-style-not-known');
    }
    const catalog = await this.fightingStyles.getFightingStyles();
    actorRound.setActiveStyle(evaluateActiveStyle(actorRound, style, catalog, command.options));
    return await this.actorRoundRepository.update(actorRound);
  }
}
