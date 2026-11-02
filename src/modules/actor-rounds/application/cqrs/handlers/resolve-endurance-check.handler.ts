import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type ManeuverPort, MANEUVER_PORT } from '../../../../actions/application/ports/maneuver.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { ResolveEnduranceCheckCommand } from '../commands/resolve-endurance-check.command.js';

/**
 * Endurance roll (§5.5, Table 5-5, M6): the result's fatigue goes into the actor's fatigue penalty, which every
 * action then takes as the `fatigue` penalty source, and its hits are taken. Fatigue beyond -50 is an injury (spec 013). The +5 of an absolute success to the
 * next action is not modelled: it is in the result message for the game master.
 */
@CommandHandler(ResolveEnduranceCheckCommand)
export class ResolveEnduranceCheckHandler implements ICommandHandler<ResolveEnduranceCheckCommand, ActorRound> {
  private readonly logger = new Logger(ResolveEnduranceCheckHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(MANEUVER_PORT) private readonly maneuverPort: ManeuverPort,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: ResolveEnduranceCheckCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);

    const actorRound = await this.actorRoundRepository.findById(command.roundActorId);
    if (!actorRound) throw new NotFoundError('ActorRound', command.roundActorId);
    const game = await this.gameRepository.findById(actorRound.gameId);
    game?.checkNotFinished();

    if (command.alertId && !actorRound.alerts.some(a => a.id === command.alertId)) {
      throw new ValidationError(`Alert ${command.alertId} not found in the actor round`);
    }
    if (typeof command.roll !== 'number' || !Number.isFinite(command.roll)) {
      throw new ValidationError('Required roll value');
    }

    const modifiers = (command.modifiers || []).reduce((acc, mod) => acc + (mod.value || 0), 0);
    const result = await this.maneuverPort.endurance(command.roll + modifiers);
    this.logger.debug(`Endurance check result: ${JSON.stringify(result)}`);

    const phase = game && game.round === actorRound.round ? game.getEffectPhase() : undefined;
    actorRound.applyEnduranceResult(result.fatigue || 0, result.hitPoints || 0, command.alertId, game?.name, phase);
    return this.actorRoundRepository.update(actorRound);
  }
}
