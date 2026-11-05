import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import type { InjurySourceKind } from '../../../domain/value-objects/injury.vo.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { HazardAttackService } from '../../services/hazard-attack.service.js';
import { ResolveCriticalAlertCommand } from '../commands/resolve-critical-alert.command.js';
import { phaseOf } from './resolve-hazard.handler.js';

/** Source of the injuries and effects of the critical, by the origin of its alert. */
const SOURCE_KINDS: Record<string, InjurySourceKind> = { fumble: 'fumble', hazard: 'hazard' };

/**
 * `POST /v1/actor-rounds/:id/alerts/:alertId/critical-roll` (workspace spec 077, decision D3): the critical of a fumble
 * (with its `criticalType`), of a movement or percent maneuver gone wrong, of a cauterization (on the location of the
 * injury) or of a hazard is rolled, applied as an attack critical and its alert closed. Registered in the actions module,
 * which has the critical table port.
 */
@CommandHandler(ResolveCriticalAlertCommand)
export class ResolveCriticalAlertHandler implements ICommandHandler<ResolveCriticalAlertCommand, ActorRound> {
  private readonly logger = new Logger(ResolveCriticalAlertHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly hazards: HazardAttackService,
  ) {}

  async execute(command: ResolveCriticalAlertCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) throw new NotFoundError('Actor round', command.actorRoundId);
    const game = await this.gameRepository.findById(actorRound.gameId);
    if (!game) throw new NotFoundError('Game', actorRound.gameId);
    game.checkNotFinished();
    const pending = actorRound.pendingCritical(command.alertId);
    const criticalType = command.criticalType || pending.criticalType;
    if (!criticalType) {
      throw new ValidationError('The critical of a fumble needs its criticalType', 'validation', { origin: pending.origin });
    }
    const context = { gameId: game.id, gameName: game.name, round: actorRound.round, phase: phaseOf(game) };
    const kind = SOURCE_KINDS[pending.origin ?? ''] ?? 'critical';
    const applied = await this.hazards.applyCritical(
      actorRound,
      {
        criticalType,
        criticalSeverity: pending.criticalSeverity,
        roll: command.roll,
        location: pending.location,
        source: { kind, tacticalGameId: game.id, tacticalGameName: game.name, round: actorRound.round },
      },
      context,
    );
    actorRound.completeCriticalAlert({
      alertId: pending.alert.id,
      origin: pending.origin,
      criticalType: criticalType.toUpperCase(),
      criticalSeverity: pending.criticalSeverity,
      roll: command.roll,
      ...applied,
    });
    const updated = await this.actorRoundRepository.update(actorRound);
    updated.lastCriticalRoll = actorRound.lastCriticalRoll;
    return updated;
  }
}
