import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type ActionRepository, ACTION_REPOSITORY } from '../../../../actions/application/ports/action-repository.port.js';
import { Action } from '../../../../actions/domain/aggregates/action.js';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Game } from '../../../domain/aggregates/game.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { StartPhaseCommand } from '../commands/start-phase.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

const MAX_PAGE_SIZE = 1000;
const ACTION_PHASES = 4;

@CommandHandler(StartPhaseCommand)
export class StartPhaseHandler implements ICommandHandler<StartPhaseCommand, Game> {
  private readonly logger = new Logger(StartPhaseHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: StartPhaseCommand): Promise<Game> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { gameId } = command;
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundError('Game', gameId);
    }
    game.checkNotFinished();
    // Dead and flatfooted actors don't roll initiative.
    const pendingActors = (await this.actorRoundRepository.findWithUndefinedInitiativeRoll(game.id, game.round)).filter(
      ar => !ar.isDead() && !ar.hasEffect('flatfooted'),
    );
    if (pendingActors.length > 0) {
      throw new ValidationError('There are still character rounds without initiative declared');
    }
    await this.advanceActorRounds(game);
    game.startPhase();
    const updatedGame = await this.gameRepository.update(game.id, game);
    const events = game.getUncommittedEvents();
    void this.eventPublisher.publish('game', ...events);
    return updatedGame;
  }

  /**
   * When an action phase ends (also the 4th, moving to the upkeep), every actor round records the AP spent in it,
   * 0 when no action spans the phase (spec 007, §10), and the ledger of its legacy actions (stored before spec 011) is
   * filled up to it from their phases.
   *
   * When an action phase starts (1-4, phase 1 too when the initiative phase ends), each open action takes 1 AP of it
   * (spec 011, §5): spent when the phase has free capacity, else recorded as lost (staggered…). When the actor cannot
   * act (dead, dying, unconscious or without AP this round) the action is interrupted instead. Moving to the upkeep
   * spends nothing. An action that already has an entry in the new phase is left as it is, so it can run again.
   */
  private async advanceActorRounds(game: Game): Promise<void> {
    const ending = Game.toActionPhase(game.phase);
    const starting = StartPhaseHandler.startingActionPhase(game);
    if (ending === undefined && starting === undefined) {
      return;
    }
    const rsql = `gameId==${game.id};round==${game.round}`;
    const [actorRounds, actions] = await Promise.all([
      this.actorRoundRepository.findByRsql(rsql, 0, MAX_PAGE_SIZE).then(page => page.content),
      this.actionRepository.findByRsql(rsql, 0, MAX_PAGE_SIZE).then(page => page.content),
    ]);
    for (const actorRound of actorRounds) {
      const actorActions = actions.filter(action => action.actorId === actorRound.actorId);
      let changed = false;
      if (ending !== undefined) {
        actorRound.logPhase(ending, Action.spentApInPhase(actorActions, ending));
        actorRound.fillLedgerFromActions(
          actorActions.filter(action => action.isLegacy()),
          ending,
        );
        changed = true;
      }
      const updatedActions = starting !== undefined ? this.carryOpenActions(actorRound, actorActions, starting, ending ?? starting) : [];
      if (changed || updatedActions.length > 0) {
        await this.actorRoundRepository.update(actorRound.id, actorRound);
      }
      for (const action of updatedActions) {
        await this.actionRepository.update(action.id, action);
      }
    }
  }

  /** The open actions of an actor take 1 AP of the phase that starts, or are interrupted. Returns the changed ones. */
  private carryOpenActions(actorRound: ActorRound, actions: Action[], phase: number, currentPhase: number): Action[] {
    const changed: Action[] = [];
    const open = actions
      .filter(action => action.carriesOnPhaseChange() || (action.isLegacy() && action.status === 'declared' && !action.freeAction))
      .sort((a, b) => a.phaseStart - b.phaseStart || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const action of open) {
      if (!actorRound.canAct()) {
        action.fillLegacyLedger(actorRound, currentPhase);
        action.close(actorRound, currentPhase, 'interrupted');
        this.logger.log(`Action ${action.id} of ${action.actorId} interrupted: the actor cannot act`);
        changed.push(action);
      } else if (action.advanceToPhase(actorRound, phase)) {
        changed.push(action);
      }
    }
    return changed;
  }

  /** The action phase a phase change starts: 1 after the initiative, n+1 after phase n (1-3), none after phase 4. */
  private static startingActionPhase(game: Game): number | undefined {
    if (game.phase === 'declare_initiative') {
      return 1;
    }
    const phase = Game.toActionPhase(game.phase);
    return phase !== undefined && phase < ACTION_PHASES ? phase + 1 : undefined;
  }
}
