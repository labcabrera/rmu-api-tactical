/* eslint-disable @typescript-eslint/no-misused-promises */
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/out/character-round.repository';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { Game } from '../../../../games/domain/entities/game.aggregate';
import { ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import { CreateActionCommand } from '../commands/create-action.command';

@CommandHandler(CreateActionCommand)
export class CreateActionHandler implements ICommandHandler<CreateActionCommand, Action> {
  private readonly logger = new Logger(CreateActionCommand.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
  ) {}

  async execute(command: CreateActionCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    this.validateCommand(command);
    const game = await this.readGame(command);
    this.validateGame(game);
    const round = game.round;
    const [actorRound, roundActions] = await Promise.all([this.readActorRound(command, round), this.readActions(command, round)]);
    this.validateActorRoundAndActions(actorRound, roundActions);
    const action = Action.create(
      command.gameId,
      command.actorId,
      round,
      command.actionType,
      command.phaseStart,
      undefined,
      command.description,
      command.userId,
    );
    const saved = await this.actionRepository.save(action);
    const events = action.pullDomainEvents();
    events.forEach((event) => this.actionEventBus.publish(event));
    return saved;
  }

  private async readGame(command: CreateActionCommand): Promise<Game> {
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new ValidationError(`Game ${command.gameId} not found`);
    }
    return game;
  }

  private async readActorRound(command: CreateActionCommand, round: number): Promise<ActorRound> {
    const rsql = `gameId==${command.gameId};actorId==${command.actorId};round==${round}`;
    const characterRounds = await this.actorRoundRepository.findByRsql(rsql, 0, 100);
    if (characterRounds.content.length === 0) {
      throw new ValidationError(`CharacterRound for game ${command.gameId}, character ${command.actorId}, round ${round} not found`);
    }
    return characterRounds.content[0];
  }

  private async readActions(command: CreateActionCommand, round: number): Promise<Action[]> {
    const rsql = `gameId==${command.gameId};actorId==${command.actorId};round==${round}`;
    const actions = await this.actionRepository.findByRsql(rsql, 0, 100);
    return actions.content;
  }

  private validateCommand(command: CreateActionCommand): void {
    if (command.actionType === 'maneuver' && !command.maneuver) {
      throw new ValidationError(`Maneuver must be provided`);
    }
  }

  private validateGame(game: Game): void {
    if (game.round < 1) {
      throw new ValidationError(`Game ${game.name} is not in progress. You need to start the game.`);
    }
    switch (game.phase) {
      case 'not_started':
      case 'declare_initiative':
      case 'upkeep':
        throw new ValidationError(`Game ${game.name} is not in the declare_actions phase.`);
      default:
        break;
    }
  }

  private validateActorRoundAndActions(actorRound: ActorRound, actions: Action[]): void {
    if (actions.length === 0) {
      return;
    }
    //TODO check collisions)
  }
}
