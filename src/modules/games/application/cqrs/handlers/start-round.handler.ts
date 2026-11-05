import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type ActionRepository, ACTION_REPOSITORY } from '../../../../actions/application/ports/action-repository.port.js';
import { Action } from '../../../../actions/domain/aggregates/action.js';
import { CreateActorRoundCommand } from '../../../../actor-rounds/application/cqrs/commands/create-actor-round.command.js';
import { UpkeepActorRoundCommand } from '../../../../actor-rounds/application/cqrs/commands/upkeep-actor-round.command.js';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundAlert } from '../../../../actor-rounds/domain/value-objects/actor-round-alert.vo.js';
import { type PsychologyTablesPort, PSYCHOLOGY_TABLES_PORT } from '../../../../psychology/application/ports/psychology-tables.port.js';
import { FearUpkeep } from '../../../../psychology/domain/services/fear-upkeep.js';
import type { PsychologyTables } from '../../../../psychology/domain/value-objects/psychology-tables.vo.js';
import { MedicalAbortService } from '../../../../actor-rounds/application/services/medical-abort.service.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { openRoundsOf, STRATEGIC_GAME_PORT } from '../../../../strategic/application/ports/strategic-game.port.js';
import type { StrategicGamePort } from '../../../../strategic/application/ports/strategic-game.port.js';
import { Game } from '../../../domain/aggregates/game.js';
import { Actor } from '../../../domain/value-objects/actor.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { StartRoundCommand } from '../commands/start-round.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

const MAX_PAGE_SIZE = 1000;
/** Last action phase of a round. */
const LAST_PHASE = 4;

@CommandHandler(StartRoundCommand)
export class StartRoundHandler implements ICommandHandler<StartRoundCommand, Game> {
  private readonly logger = new Logger(StartRoundHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    private commandBus: CommandBus,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(STRATEGIC_GAME_PORT) private readonly strategicGameClient: StrategicGamePort,
    private readonly medicalAbort: MedicalAbortService,
    @Inject(PSYCHOLOGY_TABLES_PORT) private readonly psychologyTables: PsychologyTablesPort,
  ) {}

  async execute(command: StartRoundCommand): Promise<Game> {
    this.logger.log(`Starting round for game ${command.gameId} for user ${command.userId}`);
    const { gameId } = command;
    const game = await this.gameRepository.findById(gameId);
    if (!game) throw new NotFoundError('Game', gameId);
    game.checkNotFinished();

    //TODO make saga
    if (game.round > 0) {
      // Workspace spec 077, decision D7: at altitude the fatigue takes twice the rest.
      const slow = (game.environment?.altitudeFatigueModifier ?? 0) < 0;
      await Promise.all(
        game.actors.map(actor => this.applyUpkeepToActorRounds(game.id, actor, game.round, command.userId, command.roles, slow)),
      );
      await this.addFearAlerts(game);
    }
    // The actor rounds of the new round exist before the continuations: they take their AP when phase 1 starts.
    await Promise.all(game.actors.map(actor => this.createActorRounds(game.id, game.round + 1, actor)));
    if (game.round > 0) {
      await this.carryOverActions(game);
    }
    game.startRound();
    const updatedGame = await this.gameRepository.update(game);
    const events = game.getUncommittedEvents();
    void this.eventPublisher.publish('game', ...events);
    // The events are handed over: clear them, so a later write of the same aggregate does not publish them again.
    game.commit();
    return updatedGame;
  }

  /**
   * Spec 011, §5: the actions still open when the round ends. With open rounds (the game option, on by default) or a
   * multi-round profile, an action goes on as a continuation in the new round with the AP it had, and it is closed as
   * `carried`; a held action goes on held whatever the option. Otherwise (and an instantaneous action always) it
   * `expired`. When the actor cannot act any more (dead, dying or unconscious after the upkeep) it is `interrupted`.
   * Actions under resolution are left as they are. Closed actions are skipped, so it can run again.
   */
  private async carryOverActions(game: Game): Promise<void> {
    const rsql = `gameId==${game.id};round==${game.round}`;
    const actions = (await this.actionRepository.findByRsql(rsql, 0, MAX_PAGE_SIZE)).content.filter(
      action => action.status === 'declared' || action.status === 'held',
    );
    if (actions.length === 0) {
      return;
    }
    const [actorRounds, strategicGame] = await Promise.all([
      this.actorRoundRepository.findByRsql(rsql, 0, MAX_PAGE_SIZE).then(page => page.content),
      this.strategicGameClient.findById(game.strategicGameId),
    ]);
    const openRounds = openRoundsOf(strategicGame);
    const changedActorRounds = new Set<ActorRound>();
    const interrupted: Action[] = [];
    for (const action of actions) {
      const actorRound = actorRounds.find(ar => ar.actorId === action.actorId);
      if (actorRound && action.fillLegacyLedger(actorRound, LAST_PHASE)) {
        changedActorRounds.add(actorRound);
      }
      const outcome = action.roundEndOutcome(openRounds);
      if (outcome === 'none') {
        continue;
      }
      // Workspace spec 068, decision 4: a healer unable to treat after the upkeep interrupts its medical action
      if (actorRound?.isIncapacitated() || (action.actionType === 'medical' && actorRound && !actorRound.canHeal())) {
        action.close(actorRound, LAST_PHASE, 'interrupted');
        interrupted.push(action);
      } else if (outcome === 'expired') {
        action.close(actorRound, LAST_PHASE, 'expired');
      } else {
        const carriedAp = action.apOf(actorRound, LAST_PHASE);
        const continuation = Action.continuationOf(action, game.round + 1, carriedAp);
        action.close(actorRound, LAST_PHASE, 'carried');
        await this.actionRepository.save(continuation);
      }
      this.logger.log(`Action ${action.id} of ${action.actorId} ${action.status} at the end of round ${game.round}`);
      await this.actionRepository.update(action);
    }
    // The treatment stops on the patient of this round and of the new one, already created
    const aborted = await this.medicalAbort.abort(interrupted, { known: actorRounds, rounds: action => [action.round, action.round + 1] });
    for (const action of aborted) {
      const patient = actorRounds.find(ar => ar.actorId === action.medical!.patientActorId);
      if (patient) changedActorRounds.add(patient);
      await this.actionRepository.update(action);
    }
    for (const actorRound of changedActorRounds) {
      await this.actorRoundRepository.update(actorRound);
    }
  }

  /**
   * Workspace spec 068, decisions 16 and 18: after the upkeep, the fear check a faction's fallen allies suggest (once
   * per threshold and game) and the fear RR of Revulsion. Without the psychology tables of core nothing is alerted.
   */
  private async addFearAlerts(game: Game): Promise<void> {
    let tables: PsychologyTables;
    try {
      tables = await this.psychologyTables.find();
    } catch (error) {
      this.logger.warn(`No fear alerts in the upkeep, psychology tables not available: ${(error as Error).message}`);
      return;
    }
    const rsql = `gameId==${game.id};round==${game.round}`;
    const actorRounds = (await this.actorRoundRepository.findByRsql(rsql, 0, MAX_PAGE_SIZE)).content;
    const changed = new Set<ActorRound>();
    for (const check of FearUpkeep.suggestedChecks(actorRounds, tables.fallenThresholds, game.fearThresholdsAlerted)) {
      check.actorRound.alerts.push(ActorRoundAlert.buildFearCheckSuggested(check.factionId, check.frightLevel, check.fallenShare));
      game.markFearThresholds(check.factionId, check.keys);
      changed.add(check.actorRound);
    }
    for (const check of FearUpkeep.revulsionChecks(actorRounds, tables)) {
      check.actorRound.alerts.push(ActorRoundAlert.buildRevulsionRr(check.level));
      changed.add(check.actorRound);
    }
    for (const actorRound of changed) {
      await this.actorRoundRepository.update(actorRound);
    }
  }

  private async createActorRounds(gameId: string, round: number, actor: Actor): Promise<void> {
    const command = new CreateActorRoundCommand(gameId, actor, round);
    await this.commandBus.execute(command);
  }

  private async applyUpkeepToActorRounds(
    gameId: string,
    actor: Actor,
    round: number,
    userId: string,
    roles: string[],
    slowFatigueRecovery: boolean,
  ): Promise<void> {
    const command = new UpkeepActorRoundCommand(gameId, actor.id, round, userId, roles, slowFatigueRecovery);
    await this.commandBus.execute(command);
  }
}
