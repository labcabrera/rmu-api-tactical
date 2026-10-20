import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActionRepository } from '../../../../actions/application/ports/action.repository';
import { Action } from '../../../../actions/domain/aggregates/action.aggregate';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/actor-round.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Game } from '../../../domain/aggregates/game.aggregate';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { StartPhaseCommand } from '../commands/start-phase.command';

const MAX_PAGE_SIZE = 1000;

@CommandHandler(StartPhaseCommand)
export class StartPhaseHandler implements ICommandHandler<StartPhaseCommand, Game> {
  private readonly logger = new Logger(StartPhaseHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('GameEventBus') private readonly gameEventBus: GameEventBusPort,
  ) {}

  async execute(command: StartPhaseCommand): Promise<Game> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { gameId } = command;
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundError('Game', gameId);
    }
    // Dead and flatfooted actors don't roll initiative.
    const pendingActors = (await this.actorRoundRepository.findWithUndefinedInitiativeRoll(game.id, game.round)).filter(
      ar => !ar.isDead() && !ar.hasEffect('flatfooted'),
    );
    if (pendingActors.length > 0) {
      throw new ValidationError('There are still character rounds without initiative declared');
    }
    await this.logEndingPhase(game);
    game.startPhase();
    const updatedGame = await this.gameRepository.update(game.id, game);
    const events = game.getUncommittedEvents();
    events.forEach(event => this.gameEventBus.publish(event));
    return updatedGame;
  }

  /**
   * When an action phase ends (also the 4th, moving to the upkeep), every actor round records the AP spent in it,
   * 0 when no action spans the phase (spec 007, §10).
   */
  private async logEndingPhase(game: Game): Promise<void> {
    const phase = Game.toActionPhase(game.phase);
    if (phase === undefined) {
      return;
    }
    const rsql = `gameId==${game.id};round==${game.round}`;
    const [actorRounds, actions] = await Promise.all([
      this.actorRoundRepository.findByRsql(rsql, 0, MAX_PAGE_SIZE).then(page => page.content),
      this.actionRepository.findByRsql(rsql, 0, MAX_PAGE_SIZE).then(page => page.content),
    ]);
    for (const actorRound of actorRounds) {
      const actorActions = actions.filter(action => action.actorId === actorRound.actorId);
      actorRound.logPhase(phase, Action.spentApInPhase(actorActions, phase));
      await this.actorRoundRepository.update(actorRound.id, actorRound);
    }
  }
}
