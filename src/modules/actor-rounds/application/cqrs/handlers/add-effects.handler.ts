import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { Game } from '../../../../games/domain/aggregates/game.aggregate';
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
    const game = await this.gameRepository.findById(actorRound.gameId);
    game?.checkNotFinished();

    actorRound.consumeEffects(command.consumedEffectIds || []);
    const application = command.application ?? this.readApplication(actorRound, command, game);
    const hpChanges = command.hpChanges || [];
    actorRound.applyAttackResults(
      command.dmg,
      command.effects,
      command.location,
      application,
      command.injuries || [],
      hpChanges.filter(change => change.amount < 0),
      command.fumbleAttackName,
    );
    this.heal(actorRound, command, application);
    const updated = await this.actorRoundRepository.update(actorRound.id, actorRound);
    //TODO notify event bus
    return updated;
  }

  /** The hits healed, one log entry per origin (spec 013, §1.1); without origins, a `heal` effect. */
  private heal(actorRound: ActorRound, command: AddEffectsCommand, application: EffectApplication | undefined): void {
    if (!(command.heal > 0)) {
      return;
    }
    const heals = (command.hpChanges || []).filter(change => change.amount > 0);
    if (heals.length === 0) {
      actorRound.heal(command.heal, { kind: 'treatment', phase: application?.phase });
      return;
    }
    heals.forEach(change => actorRound.heal(change.amount, { ...change, phase: change.phase ?? application?.phase }));
  }

  /**
   * Effects added by the game master: the game's current phase and the AP of the phases already logged. Effects added
   * to an actor round of another round are not stamped.
   */
  private readApplication(actorRound: ActorRound, command: AddEffectsCommand, game: Game | null): EffectApplication | undefined {
    if (!command.effects || command.effects.length === 0) {
      return undefined;
    }
    if (!game || game.round !== actorRound.round) {
      return undefined;
    }
    const phase = game.getEffectPhase();
    return { phase, spentAp: actorRound.getSpentAp(phase) };
  }
}
