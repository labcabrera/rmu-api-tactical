/* eslint-disable @typescript-eslint/no-misused-promises */
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/actor-round.repository';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { Game } from '../../../../games/domain/aggregates/game.aggregate';
import { ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionManeuver } from '../../../domain/value-objects/action-maneuver.vo';
import { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import type { SkillCatalogPort } from '../../ports/skill-catalog.port';
import { CreateActionCommand } from '../commands/create-action.command';

@CommandHandler(CreateActionCommand)
export class CreateActionHandler implements ICommandHandler<CreateActionCommand, Action> {
  private readonly logger = new Logger(CreateActionCommand.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
    @Inject('SkillCatalogPort') private readonly skillCatalog: SkillCatalogPort,
  ) {}

  async execute(command: CreateActionCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    this.validateCommand(command);

    const game = await this.readGame(command);
    this.checkDeclareActionAllowed(game);

    const round = game.round;
    const [actorRound, roundActions] = await Promise.all([this.readActorRound(command, round), this.readActions(command, round)]);

    Action.checkDeclaration(actorRound, roundActions, command.phaseStart, command.freeAction, game.getActionPhase());
    const maneuver = await this.mapManeuver(command);
    const action = Action.create(
      command.gameId,
      command.actorId,
      round,
      command.actionType,
      command.freeAction,
      command.phaseStart,
      maneuver,
      command.description,
      command.userId,
    );
    const saved = await this.actionRepository.save(action);
    const events = action.getUncommittedEvents();
    events.forEach(event => this.actionEventBus.publish(event));
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
    const actorRounds = await this.actorRoundRepository.findByRsql(rsql, 0, 100);
    if (actorRounds.content.length === 0) {
      throw new ValidationError(`Actor round for game ${command.gameId}, character ${command.actorId}, round ${round} not found`);
    }
    return actorRounds.content[0];
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

  private checkDeclareActionAllowed(game: Game): void {
    if (game.round < 1) {
      throw new ValidationError(`Game ${game.name} is not in progress. You need to start the game.`);
    }
    switch (game.phase) {
      case 'not_started':
      case 'declare_initiative':
      case 'upkeep':
        throw new ValidationError(`Phase ${game.phase} does not allow declare actions`, `err-invalid-declare-action-phase`);
      default:
        break;
    }
  }

  private async mapManeuver(command: CreateActionCommand): Promise<ActionManeuver | null> {
    if (command.actionType !== 'maneuver') {
      return null;
    }
    const declared = command.maneuver!;
    const continued = declared.continuesActionId ? await this.readContinuedManeuver(command) : null;
    const maneuverType = continued ? 'percent' : declared.maneuverType || (await this.defaultManeuverType(declared.skillId));
    return {
      modifiers: {
        skillId: declared.skillId,
        specialization: declared.specialization ?? continued?.maneuver?.modifiers.specialization ?? null,
        maneuverType,
        difficulty: 'm',
        customBonus: 0,
        lightModifier: 'none',
        light: 'no_shadows',
      },
      progress: maneuverType === 'percent' ? (continued?.maneuver?.progress ?? 0) : undefined,
      continuesActionId: continued?.id,
    };
  }

  private async defaultManeuverType(skillId: string): Promise<ManeuverType> {
    const skill = await this.skillCatalog.findSkill(skillId);
    return skill?.maneuver?.defaultType || 'absolute';
  }

  /**
   * §4.4 of spec 010: a maneuver continues a resolved percent maneuver of the same actor and skill whose task is not
   * complete yet, and inherits its progress.
   */
  private async readContinuedManeuver(command: CreateActionCommand): Promise<Action> {
    const declared = command.maneuver!;
    const continued = await this.actionRepository.findById(declared.continuesActionId!);
    const code = 'err-maneuver-invalid-continuation';
    if (!continued || continued.actionType !== 'maneuver' || !continued.maneuver) {
      throw new ValidationError(`Action ${declared.continuesActionId} is not a maneuver to continue`, code);
    }
    const modifiers = continued.maneuver.modifiers;
    if (continued.actorId !== command.actorId || continued.gameId !== command.gameId) {
      throw new ValidationError('A maneuver can only continue another maneuver of the same actor', code);
    }
    if (modifiers.maneuverType !== 'percent') {
      throw new ValidationError('Only a percent maneuver can be continued', code);
    }
    if (declared.maneuverType && declared.maneuverType !== 'percent') {
      throw new ValidationError('The continuation of a percent maneuver is a percent maneuver', code);
    }
    if (continued.status !== 'completed' || continued.maneuver.result?.completed) {
      throw new ValidationError('Only a resolved percent maneuver whose task is not complete can be continued', code);
    }
    const sameSpecialization = !declared.specialization || (modifiers.specialization || null) === declared.specialization;
    if (modifiers.skillId !== declared.skillId || !sameSpecialization) {
      throw new ValidationError('The continuation of a maneuver uses the same skill', code);
    }
    return continued;
  }
}
