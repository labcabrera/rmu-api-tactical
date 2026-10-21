import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ManeuverPort } from '../../../../actions/application/ports/maneuver.port';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/actor-round.repository';
import { ResolveEnduranceCheckCommand } from '../commands/resolve-endurance-check.command';

/**
 * Endurance roll (§5.5, Table 5-5, M6): the result's fatigue goes into the actor's fatigue penalty, which every
 * action then takes as the `fatigue` penalty source, and its hits are taken. The +5 of an absolute success to the
 * next action is not modelled: it is in the result message for the game master.
 */
@CommandHandler(ResolveEnduranceCheckCommand)
export class ResolveEnduranceCheckHandler implements ICommandHandler<ResolveEnduranceCheckCommand, ActorRound> {
  private readonly logger = new Logger(ResolveEnduranceCheckHandler.name);

  constructor(
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ManeuverPort') private readonly maneuverPort: ManeuverPort,
  ) {}

  async execute(command: ResolveEnduranceCheckCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);

    const actorRound = await this.actorRoundRepository.findById(command.roundActorId);
    if (!actorRound) throw new NotFoundError('ActorRound', command.roundActorId);

    if (command.alertId && !actorRound.alerts.some(a => a.id === command.alertId)) {
      throw new ValidationError(`Alert ${command.alertId} not found in the actor round`);
    }
    if (typeof command.roll !== 'number' || !Number.isFinite(command.roll)) {
      throw new ValidationError('Required roll value');
    }

    const modifiers = (command.modifiers || []).reduce((acc, mod) => acc + (mod.value || 0), 0);
    const result = await this.maneuverPort.endurance(command.roll + modifiers);
    this.logger.debug(`Endurance check result: ${JSON.stringify(result)}`);

    actorRound.applyEnduranceResult(result.fatigue || 0, result.hitPoints || 0, command.alertId);
    return this.actorRoundRepository.update(actorRound.id, actorRound);
  }
}
