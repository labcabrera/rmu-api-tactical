import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActionRepository } from '../../../../actions/application/ports/action.repository';
import type { ManeuverPort } from '../../../../actions/application/ports/maneuver.port';
import { AbsoluteManeuverProcessorService } from '../../../../actions/application/services/absolute-maneuver-processor.service';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError } from '../../../../shared/domain/errors';
import type { CharacterPort } from '../../../../strategic/application/ports/character.port';
import type { StrategicGamePort } from '../../../../strategic/application/ports/strategic-game.port';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/actor-round.repository';
import { ResolveEnduranceCheckCommand } from '../commands/resolve-endurance-check.command';

@CommandHandler(ResolveEnduranceCheckCommand)
export class ResolveEnduranceCheckHandler implements ICommandHandler<ResolveEnduranceCheckCommand, ActorRound> {
  private readonly logger = new Logger(ResolveEnduranceCheckHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('CharacterClient') private readonly characterClient: CharacterPort,
    @Inject('StrategicGameClient') private readonly strategicGameClient: StrategicGamePort,
    //@Inject('ActorRoundEventBus') private readonly actorRoundEventBus: ActorRoundEventBusPort,
    @Inject('ManeuverPort') private readonly maneuverPort: ManeuverPort,
    private readonly absoluteManeuverProcessorService: AbsoluteManeuverProcessorService,
  ) {}

  async execute(command: ResolveEnduranceCheckCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);

    const actorRound = await this.actorRoundRepository.findById(command.roundActorId);
    if (!actorRound) throw new NotFoundError('ActorRound', command.roundActorId);

    const game = await this.gameRepository.findById(actorRound.gameId);
    if (!game) throw new NotFoundError('Game', actorRound.gameId);

    if (command.alertId) {
      if (!actorRound.alerts.some((a) => a.id === command.alertId))
        throw new BadRequestException('ActorRoundAlert', command.alertId);
    }

    //TODO

    const updated = await this.actorRoundRepository.update(actorRound.id, actorRound);
    return updated;
  }
}
