import { Inject, Logger } from '@nestjs/common';
import type { LightType } from '../../../domain/value-objects/light-type.vo.js';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundAlert, MOVING_MANEUVER_CRITICAL_TYPE } from '../../../../actor-rounds/domain/value-objects/actor-round-alert.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { FEAR_BALK, FEAR_BROKEN, FEAR_RETREAT, FEAR_ROUTED } from '../../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { type Pace, PACES } from '../../../../actor-rounds/domain/value-objects/injury.vo.js';
import type { ActionWarning } from '../../../domain/value-objects/action-medical.vo.js';
import {
  type StrategicGame,
  type StrategicGamePort,
  STRATEGIC_GAME_PORT,
} from '../../../../strategic/application/ports/strategic-game.port.js';
import { Action } from '../../../domain/aggregates/action.js';
import { ActionUpdatedEvent } from '../../../domain/events/action.events.js';
import { ActionMovement, ActionMovementModifiers } from '../../../domain/value-objects/action-movement.vo.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { MovementProcessorService } from '../../services/movement-processor.service.js';
import { FALL_SKILLS } from '../../../domain/services/fall-control.js';
import { FREE_MOVEMENT_MAX_PACE } from '../../../domain/services/free-movement-pace.js';
import { PACE_ORDER } from '../../../domain/services/uncoordinated-pace.js';
import { ResolveMovementCommand } from '../commands/resolve-movement.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(ResolveMovementCommand)
export class ResolveMovementHandler implements ICommandHandler<ResolveMovementCommand, Action> {
  private readonly logger = new Logger(ResolveMovementHandler.name);

  constructor(
    private readonly movementProcessorService: MovementProcessorService,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(STRATEGIC_GAME_PORT) private readonly strategicGameClient: StrategicGamePort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: ResolveMovementCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);

    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);

    this.validate(command, action);
    const [actorRound, strategicGame] = await Promise.all([
      this.actorRoundRepository.findByActorIdAndRound(action.gameId, action.actorId, action.round),
      this.strategicGameClient.findById(game.strategicGameId),
    ]);
    if (!actorRound) throw new NotFoundError('ActorRound', `${action.actorId} - ${action.round}`);
    if (!strategicGame) throw new NotFoundError('StrategicGame', game.strategicGameId);

    const currentPhase = game.getActionPhase();
    action.checkResolvable(actorRound, currentPhase);
    // Workspace spec 077, decision A2.4: with two foci the actor only moves at creeping pace.
    if (actorRound.isDoubleConcentrating() && command.modifiers.pace !== 'creep') {
      throw new ValidationError('An actor concentrating on two things only moves at creeping pace', 'err-action-double-concentration', {
        pace: command.modifiers.pace,
      });
    }
    await this.checkGrapple(command, actorRound);
    const warnings = ResolveMovementHandler.paceWarnings(command.modifiers.pace, actorRound);
    if (!command.confirm && warnings.some(warning => warning.requiresConfirm)) {
      throw new ConflictError('The movement needs a confirmation: send it again with confirm: true', 'err-action-confirm-required', {
        warnings,
      });
    }
    await this.processAction(command, action, actorRound, strategicGame, currentPhase, game.environment?.light ?? null);
    const updated = await this.actionRepository.update(action);
    let actorRoundModified = false;
    if (action.fatigue) {
      actorRoundModified = true;
      // Workspace spec 077, decision D6: through addFatigue, which raises the endurance alert from 100.
      actorRound.addFatigue(action.fatigue);
    }
    if (action.movement?.calculated.critical) {
      actorRoundModified = true;
      const alert = ActorRoundAlert.buildCritical(MOVING_MANEUVER_CRITICAL_TYPE, action.movement?.calculated.critical);
      actorRound.alerts.push(alert);
      // Workspace spec 077, decision D5: a climbing or jumping movement gone wrong suggests a fall.
      const skillId = action.movement.modifiers.skillId;
      if (action.movement.modifiers.requiredManeuver && skillId && FALL_SKILLS.includes(skillId)) {
        actorRound.alerts.push(ActorRoundAlert.buildFallSuggested('movement', action.id, skillId));
      }
    }
    // Workspace spec 068, decision 5: exertion reopens a completed pressure, a failed roll the stitches
    if (ResolveMovementHandler.isExertion(command.modifiers.pace) && actorRound.reopenWounds('exertion').length > 0) {
      actorRoundModified = true;
    }
    if (ResolveMovementHandler.failedRoll(action) && actorRound.reopenWounds('failed-roll').length > 0) {
      actorRoundModified = true;
    }
    if (actorRoundModified) {
      await this.actorRoundRepository.update(actorRound);
    }
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    updated.refreshApState(actorRound, currentPhase);
    updated.warnings = warnings;
    return updated;
  }

  /** Above walking pace the actor exerts itself (decision 5). */
  static isExertion(pace: string): boolean {
    return PACES.indexOf(pace as Pace) > PACES.indexOf('walk');
  }

  /** A movement maneuver that failed: a critical, or no progress at all. */
  static failedRoll(action: Action): boolean {
    const calculated = action.movement?.calculated;
    return !!action.movement?.modifiers.requiredManeuver && !!calculated && (!!calculated.critical || calculated.percent <= 0);
  }

  /**
   * The pace against the injuries and the fear of the actor (workspace spec 068, decisions 5, 10 and 14): a splinted or
   * cast leg caps it (`err-movement-injury-limit`); routed and broken actors flee at running pace or faster
   * (`err-action-fear`); balk and retreat warn above walking and jogging; exertion with a wound that reopens asks for a
   * confirmation.
   */
  static paceWarnings(pace: string, actorRound: ActorRound): ActionWarning[] {
    const index = PACES.indexOf(pace as Pace);
    const limit = actorRound.injuryPaceLimit();
    if (limit && index > PACES.indexOf(limit)) {
      throw new ValidationError(`The injuries of the actor allow up to ${limit}, not ${pace}`, 'err-movement-injury-limit', {
        pace,
        limit,
      });
    }
    const fear = actorRound.fearEffect()?.status;
    if ((fear === FEAR_ROUTED || fear === FEAR_BROKEN) && index < PACES.indexOf('run')) {
      throw new ValidationError(`A ${fear} actor flees at running pace or faster`, 'err-action-fear', { state: fear });
    }
    const warnings: ActionWarning[] = [];
    if (fear === FEAR_RETREAT && index > PACES.indexOf('jog')) {
      warnings.push({ code: 'fear-retreat-pace', params: { pace, state: fear }, requiresConfirm: false });
    }
    if (fear === FEAR_BALK && index > PACES.indexOf('walk')) {
      warnings.push({ code: 'fear-balk-pace', params: { pace, state: fear }, requiresConfirm: false });
    }
    if (ResolveMovementHandler.isExertion(pace)) {
      actorRound
        .exertionInjuries()
        .forEach(injury => warnings.push({ code: 'exertion-reopens-wound', params: { injuryId: injury.id }, requiresConfirm: true }));
    }
    return warnings;
  }

  private async processAction(
    command: ResolveMovementCommand,
    action: Action,
    actorRound: ActorRound,
    strategicGame: StrategicGame,
    currentPhase: number,
    ambientLight: LightType | null = null,
  ): Promise<void> {
    action.description = command.description;
    // AP from the ledger (spec 011, §9). An instantaneous movement takes none, but covers the phases it spans.
    action.actionPoints = action.apOf(actorRound, currentPhase);
    const distanceActionPoints = action.freeAction ? Math.max(1, currentPhase - action.phaseStart + 1) : action.actionPoints;
    action.movement = this.buildActionMovement(command, ambientLight);
    const fatigueMultiplier = strategicGame.options?.fatigueMultiplier ?? 1;
    await this.movementProcessorService.process(command.roll, action, actorRound, distanceActionPoints);
    action.processFatigue(fatigueMultiplier, distanceActionPoints);
    const scale = strategicGame.options?.boardScaleMultiplier || 1;
    action.movement.calculated.distanceAdjusted = action.movement.calculated.distance * scale;
    this.roundResults(action);
    action.close(actorRound, currentPhase);
  }

  private buildActionMovement(command: ResolveMovementCommand, ambientLight: LightType | null): ActionMovement {
    return {
      modifiers: this.buildActionMovementModifers(command, ambientLight),
      roll: null,
      calculated: {
        bmr: 0,
        paceMultiplier: 0,
        percent: 0,
        distance: 0,
        distanceAdjusted: 0,
        critical: null,
        description: 'Not processed',
      },
    };
  }

  /** Workspace spec 076, P6: the light of the request, else the ambient light of the game. */
  private buildActionMovementModifers(command: ResolveMovementCommand, ambientLight: LightType | null): ActionMovementModifiers {
    return {
      pace: command.modifiers.pace,
      requiredManeuver: command.modifiers.requiredManeuver === true,
      skillId: command.modifiers.skillId,
      difficulty: command.modifiers.difficulty,
      customBonus: command.modifiers.customBonus,
      light: command.modifiers.light ?? ambientLight ?? null,
      grappleFeat: command.modifiers.grappleFeat ?? null,
    };
  }

  /**
   * Workspace spec 077, decision A3.5: a grappled actor, or one that holds another in a grapple, moves away only with
   * a contested Feat of Strength, whose outcome the movement sends (`err-movement-grappled`).
   */
  private async checkGrapple(command: ResolveMovementCommand, actorRound: ActorRound): Promise<void> {
    if (command.modifiers.grappleFeat) {
      return;
    }
    let grappled = actorRound.grapples().length > 0;
    if (!grappled) {
      const rsql = `gameId==${actorRound.gameId};round==${actorRound.round}`;
      const others = (await this.actorRoundRepository.findByRsql(rsql, 0, 1000)).content;
      grappled = others.some(other => other.id !== actorRound.id && other.isGrappledBy(actorRound.actorId));
    }
    if (grappled) {
      throw new ValidationError(
        'A grappled actor or its grappler moves away only with a contested Feat of Strength: send grappleFeat',
        'err-movement-grappled',
      );
    }
  }

  private validate(command: ResolveMovementCommand, action: Action): void {
    if (action.actionType !== 'movement') {
      throw new ValidationError('Action is not a movement action');
    } else if (action.status === 'completed') {
      throw new ValidationError('Action is already completed');
    }
    // Workspace spec 080, decision 2 (Core Law §8.2): a free movement goes up to run; sprint and dash take AP.
    const pace = command.modifiers.pace;
    if (action.isFreeMovement() && PACE_ORDER.indexOf(pace) > PACE_ORDER.indexOf(FREE_MOVEMENT_MAX_PACE)) {
      throw new ValidationError(`A free movement goes up to ${FREE_MOVEMENT_MAX_PACE}, not ${pace}`, 'err-free-movement-pace', { pace });
    }
    if (command.modifiers.requiredManeuver === true) {
      if (command.roll === null || command.roll === undefined) {
        throw new ValidationError('Roll is required for a maneuver');
      }
      if (!command.modifiers.difficulty) {
        throw new ValidationError('Difficulty is required for a maneuver');
      }
      if (!command.modifiers.skillId) {
        throw new ValidationError('SkillId is required for a maneuver');
      }
    }
  }

  private roundResults(action: Action): void {
    if (action.movement) {
      action.movement.calculated.distance = Math.round(action.movement.calculated.distance * 10) / 10;
      action.movement.calculated.distanceAdjusted = Math.round(action.movement.calculated.distanceAdjusted * 10) / 10;
    }
  }
}
