import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type ActionRepository, ACTION_REPOSITORY } from '../../../../actions/application/ports/action-repository.port.js';
import { fallControlStepsOf } from '../../../../actions/domain/services/fall-control.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import type { Game } from '../../../../games/domain/aggregates/game.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { HazardAttackService } from '../../services/hazard-attack.service.js';
import { ResolveHazardCommand } from '../commands/resolve-hazard.command.js';

/** Action phase of the game (1-4), or 0 outside them. */
export const phaseOf = (game: Game): number => {
  const phase = /^phase_(\d)$/.exec(game.phase ?? '');
  return phase ? Number(phase[1]) : 0;
};

/**
 * `POST /v1/actor-rounds/:id/hazards` (workspace spec 077, decision D2): the game master resolves a fall or a falling
 * object on the actor. A fall can cite the `fall-control` maneuver of the actor, whose steps move its critical (D4).
 * The height sent for an actor without one (an NPC) is kept as its height (D12). Registered in the actions module, which
 * has the attack and critical table ports and the actions.
 */
@CommandHandler(ResolveHazardCommand)
export class ResolveHazardHandler implements ICommandHandler<ResolveHazardCommand, ActorRound> {
  private readonly logger = new Logger(ResolveHazardHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    private readonly hazards: HazardAttackService,
  ) {}

  async execute(command: ResolveHazardCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) throw new NotFoundError('Actor round', command.actorRoundId);
    const game = await this.gameRepository.findById(actorRound.gameId);
    if (!game) throw new NotFoundError('Game', actorRound.gameId);
    game.checkNotFinished();
    const request = command.request;
    let steps = 0;
    if (request.kind === 'fall' && request.fallControlActionId) {
      const action = await this.actionRepository.findById(request.fallControlActionId);
      steps = fallControlStepsOf(action, actorRound.gameId, actorRound.actorId);
    }
    if (
      request.kind === 'fall' &&
      typeof request.heightFeet === 'number' &&
      (actorRound.height === null || actorRound.height === undefined)
    ) {
      actorRound.height = request.heightFeet;
    }
    await this.hazards.resolve(actorRound, request, steps, {
      gameId: game.id,
      gameName: game.name,
      round: actorRound.round,
      phase: phaseOf(game),
    });
    return this.actorRoundRepository.update(actorRound);
  }
}
