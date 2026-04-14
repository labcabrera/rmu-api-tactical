import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ManeuverPort } from '../../../../actions/application/ports/maneuver.port';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/actor-round.repository';
import { ResolveEnduranceCheckCommand } from '../commands/resolve-endurance-check.command';

@CommandHandler(ResolveEnduranceCheckCommand)
export class ResolveEnduranceCheckHandler implements ICommandHandler<ResolveEnduranceCheckCommand, ActorRound> {
  private readonly logger = new Logger(ResolveEnduranceCheckHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ManeuverPort') private readonly maneuverPort: ManeuverPort,
  ) {}

  async execute(command: ResolveEnduranceCheckCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);

    const actorRound = await this.actorRoundRepository.findById(command.roundActorId);
    if (!actorRound) throw new NotFoundError('ActorRound', command.roundActorId);

    const game = await this.gameRepository.findById(actorRound.gameId);
    if (!game) throw new NotFoundError('Game', actorRound.gameId);

    if (command.alertId) {
      if (!actorRound.alerts.some(a => a.id === command.alertId)) throw new BadRequestException('ActorRoundAlert', command.alertId);
    }

    const roll = command.roll;
    const modifiers = command.modifiers.reduce((acc, mod) => acc + mod.value, 0);
    const enduranceCheckResult = await this.maneuverPort.endurance(roll + modifiers);

    //TODO
    console.log('Endurance Check Result:', enduranceCheckResult);

    const updated = await this.actorRoundRepository.update(actorRound.id, actorRound);
    return updated;
  }
}
