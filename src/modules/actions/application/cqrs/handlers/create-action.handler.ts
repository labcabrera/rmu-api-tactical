import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { Game } from '../../../../games/domain/aggregates/game.js';
import { ValidationError, NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { type CharacterPort, CHARACTER_PORT } from '../../../../strategic/application/ports/character.port.js';
import { Action } from '../../../domain/aggregates/action.js';
import { ActionUpdatedEvent } from '../../../domain/events/action.events.js';
import { ActionApProfile } from '../../../domain/value-objects/action-ap-profile.vo.js';
import { ActionManeuver } from '../../../domain/value-objects/action-maneuver.vo.js';
import { ActionResolution } from '../../../domain/value-objects/action-resolution.vo.js';
import type { ManeuverActionPoints } from '../../../domain/value-objects/maneuver-profile.vo.js';
import type { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { type SkillCatalogPort, SKILL_CATALOG_PORT } from '../../ports/skill-catalog.port.js';
import { CreateActionCommand } from '../commands/create-action.command.js';
import { SpellCastingService } from '../../services/spell/spell-casting.service.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

/**
 * Declares an action (spec 011, §2): it records its AP in the ledger of the actor round and closes as `interrupted`
 * the open action it replaces. A forced action (§6) takes no AP and starts in the current phase.
 */
@CommandHandler(CreateActionCommand)
export class CreateActionHandler implements ICommandHandler<CreateActionCommand, Action> {
  private readonly logger = new Logger(CreateActionCommand.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    @Inject(SKILL_CATALOG_PORT) private readonly skillCatalog: SkillCatalogPort,
    @Inject(CHARACTER_PORT) private readonly characterClient: CharacterPort,
    private readonly spellCasting: SpellCastingService,
  ) {}

  async execute(command: CreateActionCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    this.validateCommand(command);

    const game = await this.readGame(command);
    this.checkDeclareActionAllowed(game);
    const currentPhase = game.getActionPhase();

    const round = game.round;
    const [actorRound, roundActions] = await Promise.all([this.readActorRound(command, round), this.readRoundActions(command, round)]);
    const actorActions = roundActions.filter(action => action.actorId === command.actorId);

    const plan = Action.checkDeclaration(
      actorRound,
      actorActions,
      { actionType: command.actionType, phaseStart: command.phaseStart, freeAction: command.freeAction, forced: command.forced?.reason },
      currentPhase,
      roundActions,
    );
    const { maneuver, apRange: maneuverRange } = await this.mapManeuver(command);
    const apRange = maneuverRange ?? (await this.standUpRange(command));
    const spell =
      command.actionType === 'cast_spell'
        ? await this.spellCasting.declare(actorRound, actorActions, command.spell!.listCode, command.spell!.spellId, command.freeAction)
        : null;
    const resolution = command.forced ? ActionResolution.forced(command.forced.reason, command.forced.note) : ActionResolution.normal();
    const action = Action.create(
      command.gameId,
      command.actorId,
      round,
      command.actionType,
      command.freeAction,
      command.forced ? currentPhase : command.phaseStart,
      maneuver,
      command.description,
      command.userId,
      resolution,
      apRange,
    );
    action.spell = spell;
    action.applyDeclaration(actorRound, plan, currentPhase);
    if (command.forced) {
      this.logger.log(`Action ${action.id} of ${command.actorId} forced: ${command.forced.reason} ${command.forced.note ?? ''}`);
    }

    const saved = await this.actionRepository.save(action);
    if (plan.spend || plan.interrupted.length > 0) {
      await this.actorRoundRepository.update(actorRound);
    }
    for (const interrupted of plan.interrupted) {
      const updated = await this.actionRepository.update(interrupted);
      await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    }
    for (const event of action.getUncommittedEvents()) {
      await this.eventPublisher.publish('action', event);
    }
    action.commit();
    saved.refreshApState(actorRound, currentPhase);
    return saved;
  }

  private async readGame(command: CreateActionCommand): Promise<Game> {
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
    return game;
  }

  private async readActorRound(command: CreateActionCommand, round: number): Promise<ActorRound> {
    const rsql = `gameId==${command.gameId};actorId==${command.actorId};round==${round}`;
    const actorRounds = await this.actorRoundRepository.findByRsql(rsql, 0, 100);
    if (actorRounds.content.length === 0) {
      throw new NotFoundError('Actor round', `of actor ${command.actorId} in round ${round} of game ${command.gameId}`);
    }
    return actorRounds.content[0];
  }

  /** Every action of the round: the actor's, and the foes' attacks with the actor's parries. */
  private async readRoundActions(command: CreateActionCommand, round: number): Promise<Action[]> {
    const rsql = `gameId==${command.gameId};round==${round}`;
    const actions = await this.actionRepository.findByRsql(rsql, 0, 1000);
    return actions.content;
  }

  private validateCommand(command: CreateActionCommand): void {
    if (command.actionType === 'maneuver' && !command.maneuver) {
      throw new ValidationError(`Maneuver must be provided`);
    }
    if (command.actionType === 'cast_spell' && !command.spell) {
      throw new ValidationError('A spell cast needs its spell', 'err-spell-required');
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

  /** The maneuver of the action, and the AP range of its skill's profile (Table 8-1). */
  private async mapManeuver(
    command: CreateActionCommand,
  ): Promise<{ maneuver: ActionManeuver | null; apRange: ManeuverActionPoints | null }> {
    if (command.actionType !== 'maneuver') {
      return { maneuver: null, apRange: null };
    }
    const declared = command.maneuver!;
    const continued = declared.continuesActionId ? await this.readContinuedManeuver(command) : null;
    const skill = await this.skillCatalog.findSkill(declared.skillId);
    const maneuverType: ManeuverType = continued ? 'percent' : declared.maneuverType || skill?.maneuver?.defaultType || 'absolute';
    const range = skill?.maneuver?.actionPoints;
    const maneuver: ActionManeuver = {
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
    return { maneuver, apRange: range ? { min: range.min, max: range.max } : null };
  }

  /** Standing up takes 1 AP to an actor with Acrobatics ranks (Table 8-1, §9.8 Prone). */
  private async standUpRange(command: CreateActionCommand): Promise<ManeuverActionPoints | null> {
    if (command.actionType !== 'stand_up') {
      return null;
    }
    const character = await this.characterClient.findById(command.actorId);
    const acrobatics = character?.skills?.find(skill => skill.skillId === 'acrobatics')?.ranks || 0;
    const profile = ActionApProfile.forAction('stand_up', { acrobatics: acrobatics > 0 });
    return { min: profile.min, max: profile.max };
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
