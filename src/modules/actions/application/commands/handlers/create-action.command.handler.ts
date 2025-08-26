import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import * as characterRoundRepository from '../../../../actor-rounds/application/ports/out/character-round.repository';
import { ActorRound } from '../../../../actor-rounds/domain/entities/actor-round.entity';
import * as gameRepository from '../../../../games/application/ports/out/game.repository';
import { Game } from '../../../../games/domain/entities/game.entity';
import { ValidationError } from '../../../../shared/domain/errors';
import { Action, ActionManeuver } from '../../../domain/entities/action.entity';
import * as actionEventProducer from '../../ports/out/action-event-producer';
import * as actionRepository from '../../ports/out/action.repository';
import { CreateActionCommand } from '../create-action.command';

@CommandHandler(CreateActionCommand)
export class CreateActionCommandHandler implements ICommandHandler<CreateActionCommand, Action> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository,
    @Inject('ActorRoundRepository') private readonly characterRoundRepository: characterRoundRepository.ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: actionRepository.ActionRepository,
    @Inject('ActionEventProducer') private readonly actionEventProducer: actionEventProducer.ActionEventProducer,
  ) {}

  async execute(command: CreateActionCommand): Promise<Action> {
    this.validate(command);
    const game = await this.readGame(command);
    if (game.round < 1) {
      throw new ValidationError(`Game ${game.name} is not in progress. You need to start the game.`);
    } else if (game.phase !== 'declare_actions') {
      throw new ValidationError(`Game ${game.name} is not in the declare_actions phase.`);
    }
    const actorRound = await this.readActorRound(command, game.round);
    if (!actorRound) {
      throw new ValidationError(`ActorRound for game ${command.gameId}, character ${command.actorId}, round ${game.round} not found`);
    }
    const maneuver = this.prepareManeuver(command);
    const action: Partial<Action> = {
      gameId: command.gameId,
      status: 'declared',
      round: game.round,
      actorId: command.actorId,
      actionType: command.actionType,
      phaseStart: command.phaseStart,
      actionPoints: 0,
      maneuver: maneuver,
      createdAt: new Date(),
    };
    const saved = await this.actionRepository.save(action);
    await this.actionEventProducer.created(saved);
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
    const characterRounds = await this.characterRoundRepository.findByRsql(rsql, 0, 100);
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

  private prepareManeuver(command: CreateActionCommand): ActionManeuver | undefined {
    if (!command.maneuver) {
      return undefined;
    }
    return {
      skillId: command.maneuver.skillId,
      maneuverType: command.maneuver.maneuverType,
      difficulty: undefined,
      result: undefined,
      status: 'declared',
    };
  }

  private validate(command: CreateActionCommand): void {
    if (command.actionType === 'maneuver' && !command.maneuver) {
      throw new ValidationError(`Maneuver must be provided`);
    }
  }

  private async checkActionCollision(command: CreateActionCommand, game: Game): Promise<void> {
    const actions = await this.readActions(command, game.round);
    if (actions.length === 0) {
      return;
    }
    // TODO
  }
}
