import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError } from '../../../../shared/domain/errors';
import { ActorRound, EffectApplication } from '../../../domain/aggregates/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/actor-round.repository';
import { AddEffectsCommand } from '../commands/add-effects.command';

@CommandHandler(AddEffectsCommand)
export class AddEffectsHandler implements ICommandHandler<AddEffectsCommand, ActorRound> {
  private readonly logger = new Logger(AddEffectsHandler.name);

  constructor(
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: AddEffectsCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);

    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) throw new NotFoundError('Actor round', command.actorRoundId);

    actorRound.consumeEffects(command.consumedEffectIds || []);
    const application = command.application ?? (await this.readApplication(actorRound, command));
    actorRound.applyAttackResults(command.dmg, command.effects, command.location, application);
    const updated = await this.actorRoundRepository.update(actorRound.id, actorRound);
    //TODO notify event bus
    return updated;
  }

  /**
   * Effects added by the game master: the game's current phase and the AP of the phases already logged. Effects added
   * to an actor round of another round are not stamped.
   */
  private async readApplication(actorRound: ActorRound, command: AddEffectsCommand): Promise<EffectApplication | undefined> {
    if (!command.effects || command.effects.length === 0) {
      return undefined;
    }
    const game = await this.gameRepository.findById(actorRound.gameId);
    if (!game || game.round !== actorRound.round) {
      return undefined;
    }
    const phase = game.getEffectPhase();
    return { phase, spentAp: actorRound.getSpentAp(phase) };
  }
}
