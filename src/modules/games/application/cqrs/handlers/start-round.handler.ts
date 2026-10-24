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
  ) {}

  async execute(command: StartRoundCommand): Promise<Game> {
    this.logger.log(`Starting round for game ${command.gameId} for user ${command.userId}`);
    const { gameId } = command;
    const game = await this.gameRepository.findById(gameId);
    if (!game) throw new NotFoundError('Game', gameId);
    game.checkNotFinished();

    //TODO make saga
    if (game.round > 0) {
      await Promise.all(game.actors.map(actor => this.applyUpkeepToActorRounds(game.id, actor, game.round, command.userId, command.roles)));
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
    for (const action of actions) {
      const actorRound = actorRounds.find(ar => ar.actorId === action.actorId);
      if (actorRound && action.fillLegacyLedger(actorRound, LAST_PHASE)) {
        changedActorRounds.add(actorRound);
      }
      const outcome = action.roundEndOutcome(openRounds);
      if (outcome === 'none') {
        continue;
      }
      if (actorRound?.isIncapacitated()) {
        action.close(actorRound, LAST_PHASE, 'interrupted');
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
    for (const actorRound of changedActorRounds) {
      await this.actorRoundRepository.update(actorRound);
    }
  }

  private async createActorRounds(gameId: string, round: number, actor: Actor): Promise<void> {
    const command = new CreateActorRoundCommand(gameId, actor, round);
    await this.commandBus.execute(command);
  }

  private async applyUpkeepToActorRounds(gameId: string, actor: Actor, round: number, userId: string, roles: string[]): Promise<void> {
    const command = new UpkeepActorRoundCommand(gameId, actor.id, round, userId, roles);
    await this.commandBus.execute(command);
  }
}
