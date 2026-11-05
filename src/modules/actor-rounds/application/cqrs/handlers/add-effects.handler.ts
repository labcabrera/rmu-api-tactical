import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { Game } from '../../../../games/domain/aggregates/game.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound, type EffectApplication } from '../../../domain/aggregates/actor-round.js';
import { ActorRoundEffect, GRAPPLE_RELEASE_STATUSES } from '../../../domain/value-objects/actor-round-effect.vo.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { AddEffectsCommand } from '../commands/add-effects.command.js';

@CommandHandler(AddEffectsCommand)
export class AddEffectsHandler implements ICommandHandler<AddEffectsCommand, ActorRound> {
  private readonly logger = new Logger(AddEffectsHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
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
    (command.fumbleCriticals || []).forEach(severity => actorRound.addFumbleCriticalAlert(severity, command.fumbleAttackName));
    (command.poisonExposures || []).forEach(exposure => actorRound.exposeToPoison(exposure.poison, exposure.source));
    const updated = await this.actorRoundRepository.update(actorRound);
    await this.releaseGrapples(updated, command);
    //TODO notify event bus
    return updated;
  }

  /**
   * Workspace spec 077, decision A3.4: a grappler that is now stunned, incapacitated, paralyzed, unconscious or dead lets
   * go of the grapples it holds on the actors of the same round.
   */
  private async releaseGrapples(grappler: ActorRound, command: AddEffectsCommand): Promise<void> {
    const releasing = (command.effects || []).some(
      effect => GRAPPLE_RELEASE_STATUSES.includes(effect.status) && !ActorRoundEffect.isPending(effect, grappler.round),
    );
    if (!releasing) {
      return;
    }
    const rsql = `gameId==${grappler.gameId};round==${grappler.round}`;
    const others = (await this.actorRoundRepository.findByRsql(rsql, 0, 1000)).content.filter(other => other.id !== grappler.id);
    for (const other of others) {
      const released = other.releaseGrapplesOf(grappler.actorId);
      if (released.length > 0) {
        await this.actorRoundRepository.update(other);
        this.logger.log(`${grappler.actorName} let go of ${other.actorName}: ${released.length} grapples released`);
      }
    }
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
