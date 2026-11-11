import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRoundAlert, MOVING_MANEUVER_CRITICAL_TYPE } from '../../../../actor-rounds/domain/value-objects/actor-round-alert.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Action } from '../../../domain/aggregates/action.js';
import type { ActorRoundTrait } from '../../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { ActionUpdatedEvent } from '../../../domain/events/action.events.js';
import { ActionManeuverResult } from '../../../domain/value-objects/action-maneuver.vo.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { type ManeuverPort, MANEUVER_PORT } from '../../ports/maneuver.port.js';
import {
  DEFAULT_DIFFICULTY,
  type ManeuverChoices,
  type ManeuverContext,
  ManeuverContextService,
  type ManeuverRollCalculation,
} from '../../services/maneuver/maneuver-context.service.js';
import { ResolveManeuverCommand } from '../commands/resolve-maneuver.command.js';
import { applyFrenzyManeuver, validateFrenzyPurpose } from '../../../domain/services/frenzy-maneuver.js';
import {
  applyCombatTalentManeuver,
  type CombatTalentChoices,
  combatTalentApRange,
  combatTalentDifficulty,
  combatTalentSucceeded,
  validateCombatTalentPurpose,
} from '../../../domain/services/combat-talent-maneuver.js';
import { applyNaturalRoll } from '../../../domain/services/roll-talents.js';
import {
  ADRENAL,
  type CombatTalentPurpose,
  FALL_CONTROL,
  FEAT_OF_STRENGTH,
  FORTITUDE,
  GRAPPLE_ESCAPE,
  isCombatTalentPurpose,
  isFrenzyPurpose,
} from '../../../domain/value-objects/maneuver-purpose.vo.js';
import {
  CONTORTIONS_SKILL_ID,
  GRAPPLE_ESCAPE_DEFAULT_DIFFICULTY,
  grappleConflictModifier,
  validateGrappleEscape,
} from '../../../domain/services/grapple-escape.js';
import type { GrappleEscapeResult } from '../../../domain/value-objects/action-maneuver.vo.js';
import { FALL_SKILLS, fallControlSteps, validateFallControlManeuver } from '../../../domain/services/fall-control.js';
import {
  adrenalOutcome,
  adrenalSummary,
  applyAdrenalOutcome,
  fortitudeOutcome,
  unusualAdrenalResult,
  validateAdrenalManeuver,
} from '../../../domain/services/adrenal-maneuver.js';
import { validateFeatOfStrength } from '../../../domain/services/feat-of-strength.js';
import type { ActorRoundEffect } from '../../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import {
  absoluteEaseResult,
  type ActorRollProfile,
  rollProfileOf,
} from '../../../../actor-rounds/domain/value-objects/actor-roll-profile.vo.js';
import { checkOpenEndedDice } from '../../../../shared/domain/rolls/open-ended.js';
import { type PsychologyTablesPort, PSYCHOLOGY_TABLES_PORT } from '../../../../psychology/application/ports/psychology-tables.port.js';
import { findBand } from '../../../../psychology/domain/value-objects/psychology-tables.vo.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

/** Unmodified roll of an unusual event (§5.1). */
const UNUSUAL_EVENT_ROLL = 66;

const SUCCESS = 'success';
const ABSOLUTE_SUCCESS = 'absolute-success';

/** Price of a Trading maneuver: 200% less the result, from 50% to 200% (§14.2). */
const PRICE_BASE = 200;
const MIN_PRICE = 50;
const MAX_PRICE = 200;

/** Percent a task needs to be complete (§5.1). */
const COMPLETED_PERCENT = 100;

@CommandHandler(ResolveManeuverCommand)
export class ResolveManeuverHandler implements ICommandHandler<ResolveManeuverCommand, Action> {
  private readonly logger = new Logger(ResolveManeuverHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    @Inject(MANEUVER_PORT) private readonly maneuverPort: ManeuverPort,
    private readonly maneuverContextService: ManeuverContextService,
    @Inject(PSYCHOLOGY_TABLES_PORT) private readonly psychologyTables: PsychologyTablesPort,
  ) {}

  async execute(command: ResolveManeuverCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);

    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);
    game.checkNotFinished();

    this.validate(command, action);
    const currentPhase = parseInt((game.phase || '').replace('phase_', ''));
    if (Number.isNaN(currentPhase)) {
      throw new ValidationError(`Phase ${game.phase} does not allow resolving actions`);
    }

    // The AP come from the ledger (spec 011, §2); the range from the profile of the skill rolled.
    const request = command.request;
    const context = await this.maneuverContextService.load(action, game, {
      skillId: request.skillId,
      specialization: request.specialization,
      maneuverType: request.maneuverType,
      purpose: request.purpose,
    });
    const range = context.profile.actionPoints;
    const talent = isCombatTalentPurpose(request.purpose) ? request.purpose : undefined;
    const talentChoices = request.combatTalent ?? {};
    // Workspace spec 076, decision P4: Battle Cry takes 2 AP, Sense Weakness and Study Offense a full round.
    const talentRange = talent ? combatTalentApRange(talent) : null;
    action.apRange = talentRange ?? (range ? { min: range.min, max: range.max } : null);
    // Workspace spec 077, decision D4: Acrobatics to control a fall, absolute, instantaneous and at 0 AP.
    const fallControl = request.purpose === FALL_CONTROL;
    if (fallControl) {
      validateFallControlManeuver(action, context.skill.skillId, context.maneuverType);
    }
    // Workspace spec 079, decisions B3-B4: an adrenal move rolls an adrenal skill on Table 3-4, and Fortitude is
    // instantaneous and takes 0 AP, as a fall control.
    const fortitude = request.purpose === FORTITUDE;
    const adrenalPurpose = request.purpose === ADRENAL || fortitude;
    const adrenalKind = adrenalPurpose
      ? validateAdrenalManeuver(action, fortitude ? FORTITUDE : ADRENAL, context.skill.skillId, context.maneuverType)
      : null;
    // Workspace spec 079, decision B2: the difficulty of a feat of strength comes from its load (Table 5-2).
    let feat: ReturnType<ManeuverContextService['featOfStrength']> | undefined;
    if (request.purpose === FEAT_OF_STRENGTH) {
      validateFeatOfStrength(context.skill.skillId);
      feat = this.maneuverContextService.featOfStrength(context, request.featOfStrength ?? { loadWeight: 0 });
    }
    action.checkResolvable(context.actorRound, currentPhase);
    const fallControlLedger = (fallControl || fortitude) && ResolveManeuverHandler.freeFallControlAp(action, context, currentPhase);
    if (request.purpose === GRAPPLE_ESCAPE) {
      const grapples = validateGrappleEscape(context.actorRound, context.skill.skillId, request.grappleEscape);
      return this.resolveGrappleEscape(command, action, context, grapples, currentPhase);
    }
    if (isFrenzyPurpose(request.purpose)) {
      validateFrenzyPurpose(context.actorRound, context.skill.skillId, request.purpose);
    } else if (talent) {
      await this.validateCombatTalent(action, context, talent, talentChoices);
    }
    // Workspace spec 076, §2.8: the dice sent are an open-ended chain of the actor's roll profile.
    const rollProfile = rollProfileOf(context.actorRound.traits);
    checkOpenEndedDice(command.roll.dice, 'both', rollProfile, { total: command.roll.roll, unmodified: command.roll.unmodified });
    action.actionPoints = action.apOf(context.actorRound, currentPhase);
    const passive = request.passive ? await this.maneuverContextService.passiveTotal(context, action, request.passive) : undefined;
    // Workspace spec 079, decision B1: a similar skill and the helpers' ranks
    const aids =
      request.similarity || request.complementary?.length
        ? await this.maneuverContextService.skillAids(context, action, {
            similarity: request.similarity,
            complementary: request.complementary,
          })
        : undefined;
    // Workspace spec 079, D3: the actor perceived or tracked by smell, whose odour talents count
    const senseTarget = await this.senseTarget(action, request);
    const choices = {
      ...request,
      aids,
      feat,
      senseTarget,
      difficulty: feat
        ? feat.difficulty
        : talent
          ? combatTalentDifficulty(talent, request.difficulty, DEFAULT_DIFFICULTY)
          : request.difficulty,
      combatTalent: talentChoices,
      passiveTotal: passive && (request.passiveTotal === undefined || request.passiveTotal === null) ? passive.total : request.passiveTotal,
    };
    const calculation = this.maneuverContextService.calculate(context, choices, command.roll.roll);
    this.updateModifiers(action, choices, context, calculation);
    action.maneuver!.modifiers.passiveTotal = choices.passiveTotal;
    action.maneuver!.modifiers.targetActorId = request.passive?.targetActorId;
    action.maneuver!.modifiers.passiveSkillId = passive?.skillId;
    action.maneuver!.modifiers.purpose = request.purpose;
    action.maneuver!.modifiers.similarity = request.similarity;
    action.maneuver!.modifiers.complementary = request.complementary?.length ? request.complementary : undefined;
    action.maneuver!.modifiers.featOfStrength = request.purpose === FEAT_OF_STRENGTH ? request.featOfStrength : undefined;
    action.maneuver!.modifiers.situationalTraits = request.situationalTraits?.length ? [...new Set(request.situationalTraits)] : undefined;
    action.maneuver!.modifiers.senseTargetActorId = senseTarget
      ? (request.senseTargetActorId ?? request.passive?.targetActorId)
      : undefined;
    if (talent) {
      action.maneuver!.modifiers.foeActorId = talentChoices.foeActorId;
      action.maneuver!.modifiers.foeLevel = talentChoices.foeLevel;
      action.maneuver!.modifiers.position = talentChoices.position;
      action.maneuver!.modifiers.obPenalty = talentChoices.obPenalty;
    }
    action.maneuver!.roll = {
      modifiers: calculation.modifiers,
      roll: command.roll.roll,
      totalRoll: calculation.total,
      skipped: calculation.skipped,
    };

    const unusualEvent = command.roll.unmodified === UNUSUAL_EVENT_ROLL;
    let alert: ActorRoundAlert | null = null;
    if (context.maneuverType === 'percent' && context.profile.resultKind === 'price') {
      await this.resolvePrice(action, calculation.total);
    } else if (context.maneuverType === 'percent') {
      alert = await this.resolvePercent(action, context, calculation.total);
    } else if (context.profile.resultKind === 'morale') {
      await this.resolveMorale(action, calculation.total, unusualEvent);
    } else {
      // Workspace spec 076, §2.8: Unusual Luck turns the natural 66 of an unopposed absolute maneuver into a success.
      const unusualLuck = unusualEvent && rollProfile.unusualLuck && !request.passive && choices.passiveTotal === undefined;
      alert = await this.resolveAbsolute(action, context, calculation.total, unusualEvent && !unusualLuck, unusualLuck);
      ResolveManeuverHandler.applyAbsoluteEase(action, context, rollProfile, calculation.total);
    }
    if (fallControl) {
      action.maneuver!.result!.fallControlSteps = fallControlSteps(action.maneuver!.result?.result);
    }
    if (feat && action.maneuver!.result) {
      action.maneuver!.result.featOfStrength = feat;
    }
    const adrenalChanged = adrenalPurpose ? this.applyAdrenal(action, context, adrenalKind, calculation.total, game.name) : false;

    const application = () => ({ phase: currentPhase, spentAp: context.actorRound.getSpentAp(currentPhase) });
    const frenzyChanged = isFrenzyPurpose(request.purpose)
      ? applyFrenzyManeuver(context.actorRound, request.purpose, action.maneuver!.result?.result, application())
      : false;
    const talentEffect = talent
      ? applyCombatTalentManeuver(context.actorRound, talent, combatTalentSucceeded(action.maneuver!.result), talentChoices, {
          // Workspace spec 079, decision B1: a similar skill never gives its ranks
          ambushRanks: request.similarity ? 0 : context.skill.ranks,
          application: application(),
        })
      : undefined;
    // Workspace spec 076, decision B10 (P5): Terrible Luck and Spasm on the natural roll.
    const natural = applyNaturalRoll(
      context.actorRound,
      command.roll.unmodified ?? command.roll.dice?.[0],
      { kind: 'maneuver', actionId: action.id },
      { spasmRounds: request.spasmRounds, application },
    );
    action.close(context.actorRound, currentPhase);
    const updated = await this.actionRepository.update(action);
    if (alert) {
      context.actorRound.alerts.push(alert);
    }
    const fallSuggested = ResolveManeuverHandler.suggestFall(action, context);
    // Workspace spec 068, decision 5: a failed maneuver reopens the stitches of the actor
    const reopened = ResolveManeuverHandler.failed(action) ? context.actorRound.reopenWounds('failed-roll') : [];
    const talentsChanged = !!talentEffect || natural.terribleLuck || natural.spasm;
    if (alert || frenzyChanged || talentsChanged || reopened.length > 0 || fallSuggested || fallControlLedger || adrenalChanged) {
      await this.actorRoundRepository.update(context.actorRound);
    }
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    updated.refreshApState(context.actorRound, currentPhase);
    return updated;
  }

  /**
   * Workspace spec 077, decisions A3.3 and A3.6: an escape rolls once against each grapple in the same action, with the
   * whole grapple penalty of the actor (in its base modifiers). Each roll adds 100 less the grappler's total (nothing
   * against an object) and reads the percent table: the percent comes off the grapple (P5), which goes at 0 or less. A
   * critical (absolute failure) of Contortions tightens the grapple instead.
   */
  private async resolveGrappleEscape(
    command: ResolveManeuverCommand,
    action: Action,
    context: ManeuverContext,
    grapples: ActorRoundEffect[],
    currentPhase: number,
  ): Promise<Action> {
    const request = command.request;
    const rows = request.grappleEscape!;
    action.actionPoints = action.apOf(context.actorRound, currentPhase);
    const results: GrappleEscapeResult[] = [];
    let first: ManeuverRollCalculation | undefined;
    for (const [index, row] of rows.entries()) {
      if (typeof row.roll !== 'number' || !Number.isFinite(row.roll)) {
        throw new ValidationError('Required roll value');
      }
      const grapple = grapples[index];
      const difficulty = row.difficulty ?? request.difficulty ?? GRAPPLE_ESCAPE_DEFAULT_DIFFICULTY;
      const calculation = this.maneuverContextService.calculate(context, { ...request, difficulty, passiveTotal: undefined }, row.roll);
      const conflict = grappleConflictModifier(grapple, row);
      const modifiers = conflict ? [...calculation.modifiers, conflict] : calculation.modifiers;
      const total = calculation.total + (conflict?.value ?? 0);
      first = first ?? { ...calculation, modifiers, total };
      const table = await this.maneuverPort.percent(total);
      const critical = table.critical || null;
      const percent = critical ? 0 : table.percent || 0;
      const tightened = !!critical && context.skill.skillId === CONTORTIONS_SKILL_ID;
      const outcome = context.actorRound.escapeGrapple(grapple.id, percent, tightened);
      results.push({
        effectId: grapple.id,
        ...(grapple.targetActorId ? { grapplerId: grapple.targetActorId } : {}),
        roll: row.roll,
        difficulty,
        ...(conflict ? { passiveTotal: row.passiveTotal } : {}),
        total,
        modifiers,
        percent,
        critical,
        message: table.message,
        remaining: outcome.remaining,
        released: outcome.released,
        ...(outcome.tightened ? { tightened: true } : {}),
      });
    }
    this.updateModifiers(action, { ...request, difficulty: results[0].difficulty as ManeuverChoices['difficulty'] }, context, first!);
    action.maneuver!.modifiers.purpose = GRAPPLE_ESCAPE;
    action.maneuver!.roll = { modifiers: first!.modifiers, roll: rows[0].roll, totalRoll: first!.total, skipped: first!.skipped };
    const released = results.filter(result => result.released).length;
    action.maneuver!.result = new ActionManeuverResult(
      undefined,
      results.length === 1 ? results[0].percent : undefined,
      `Escaped from ${released} of ${results.length} grapples`,
      undefined,
      results.length === 1 ? results[0].critical : undefined,
      released === results.length,
    );
    action.maneuver!.result.grappleEscape = results;
    action.close(context.actorRound, currentPhase);
    const updated = await this.actionRepository.update(action);
    await this.actorRoundRepository.update(context.actorRound);
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    updated.refreshApState(context.actorRound, currentPhase);
    return updated;
  }

  /**
   * Workspace spec 079, decisions B3-B4: the outcome of an adrenal move or of Fortitude on Table 3-4. The cleansing
   * trance of an unusual event makes a success absolute and a failure absolute. Answers whether the actor changed.
   */
  private applyAdrenal(
    action: Action,
    context: ManeuverContext,
    kind: ReturnType<typeof validateAdrenalManeuver>,
    total: number,
    gameName: string | undefined,
  ): boolean {
    const result = action.maneuver!.result;
    if (!result) return false;
    if (result.unusualEvent) {
      result.result = unusualAdrenalResult(result.result);
    }
    const skillId = context.skill.skillId;
    const round = context.actorRound.round;
    const outcome = kind
      ? adrenalOutcome(kind, skillId, result.result, total, round)
      : fortitudeOutcome(skillId, result.result, total, round);
    result.adrenal = adrenalSummary(kind ?? 'fortitude', outcome);
    return applyAdrenalOutcome(context.actorRound, skillId, outcome, gameName);
  }

  /**
   * Workspace spec 077, decision D4 (P13): a fall-control maneuver takes 0 AP, even when the instantaneous actions of
   * the round were used up: its entries become one instantaneous entry of 0 AP. Answers whether the ledger changed.
   */
  static freeFallControlAp(action: Action, context: ManeuverContext, currentPhase: number): boolean {
    const actorRound = context.actorRound;
    if (actorRound.ledgerOf(action.id).every(entry => entry.ap === 0)) {
      return false;
    }
    actorRound.releaseAction(action.id);
    actorRound.spend(Math.min(Math.max(currentPhase, 1), 4), action.id, 0, 'instant', false);
    return true;
  }

  /**
   * Workspace spec 077, decision D5: an absolute failure of a climbing or jumping maneuver (the critical of a percent
   * one) raises a `fall-suggested` alert. Answers whether it did.
   */
  static suggestFall(action: Action, context: ManeuverContext): boolean {
    const result = action.maneuver?.result;
    if (!result || !FALL_SKILLS.includes(context.skill.skillId)) return false;
    if (result.result !== 'absolute-failure' && !result.critical) return false;
    context.actorRound.alerts.push(ActorRoundAlert.buildFallSuggested('maneuver', action.id, context.skill.skillId));
    return true;
  }

  /** A failure or absolute failure of an absolute maneuver, or a critical of a percent one (workspace spec 068). */
  static failed(action: Action): boolean {
    const result = action.maneuver?.result;
    if (!result) return false;
    return result.result === 'failure' || result.result === 'absolute-failure' || !!result.critical;
  }

  private validate(command: ResolveManeuverCommand, action: Action): void {
    if (action.actionType !== 'maneuver' || !action.maneuver) {
      throw new ValidationError('Action is not a maneuver action');
    } else if (action.status === 'completed') {
      throw new ValidationError('Action is already completed');
    } else if (command.request.purpose === GRAPPLE_ESCAPE) {
      // Workspace spec 077, decision A3.3: each grapple has its own roll.
      return;
    } else if (!command.roll || typeof command.roll.roll !== 'number' || !Number.isFinite(command.roll.roll)) {
      // A total of 0 is a valid roll (an absolute failure).
      throw new ValidationError('Required roll value');
    }
  }

  /**
   * Workspace spec 079, D3: the actor a Perception or Tracking maneuver by smell is about (`senseTargetActorId`, else the
   * passive side), with its talents; undefined for another sense or without one. `err-maneuver-target-not-found`.
   */
  private async senseTarget(
    action: Action,
    request: ResolveManeuverCommand['request'],
  ): Promise<{ traits: ActorRoundTrait[]; name: string } | undefined> {
    const targetId = request.senseTargetActorId ?? request.passive?.targetActorId;
    if (request.senses?.sense !== 'smell' || !targetId) return undefined;
    const target = await this.actorRoundRepository.findByActorIdAndRound(action.gameId, targetId, action.round);
    if (!target) throw new NotFoundError('Target actor', targetId, 'err-maneuver-target-not-found');
    return { traits: target.traits?.length ? target.traits : [], name: target.actorName };
  }

  private updateModifiers(action: Action, request: ManeuverChoices, context: ManeuverContext, calculation: ManeuverRollCalculation): void {
    action.maneuver!.modifiers = {
      ...action.maneuver!.modifiers,
      skillId: context.skill.skillId,
      specialization: context.skill.specialization,
      maneuverType: context.maneuverType,
      difficulty: request.difficulty || action.maneuver!.modifiers.difficulty || 'm',
      light: request.light ?? calculation.light,
      lightModifier: calculation.lightUsage,
      customBonus: request.customBonus,
      selections: request.selections,
      passiveTotal: request.passiveTotal,
      armorModifier: undefined,
    };
  }

  /**
   * Absolute maneuver: the result table of the skill's profile (M3), with the unusual event of an unmodified 66. With
   * `unusualLuck` (workspace spec 076, §2.8) the 66 is no unusual event: the table's absolute success, else a success.
   */
  private async resolveAbsolute(
    action: Action,
    context: ManeuverContext,
    total: number,
    unusualEvent: boolean,
    unusualLuck = false,
  ): Promise<ActorRoundAlert | null> {
    const result = await this.maneuverPort.absolute(total, context.profile.resultTable, unusualEvent);
    const lucky = unusualLuck && result.result !== ABSOLUTE_SUCCESS;
    action.maneuver!.result = new ActionManeuverResult(
      lucky ? SUCCESS : result.result,
      undefined,
      lucky ? undefined : result.message,
      lucky ? [] : (result.effects ?? []),
      undefined,
      undefined,
      unusualEvent || undefined,
    );
    if (unusualLuck) {
      action.maneuver!.result.rollTalent = 'unusual-luck';
    }
    return null;
  }

  /**
   * Workspace spec 076, §2.8: Absolute Ease of the category of the skill makes a success from its tier's total an
   * absolute success and, with Absolute Disaster, a failure up to its tier's total an absolute failure.
   */
  static applyAbsoluteEase(action: Action, context: ManeuverContext, profile: ActorRollProfile, total: number): void {
    const result = action.maneuver?.result;
    if (!result || !context.categoryId) return;
    const entry = profile.absoluteEase.find(each => each.categoryId === context.categoryId);
    const changed = absoluteEaseResult(entry, result.result, total);
    if (!changed) return;
    result.result = changed;
    result.message = undefined;
    result.effects = [];
    result.rollTalent = changed === ABSOLUTE_SUCCESS ? 'absolute-ease' : 'absolute-disaster';
  }

  /**
   * Workspace spec 076, §2.6: the maneuver of a combat talent. Battle Cry only in the actor's first round in the combat
   * (its first actor round in the game), and the foe of the others an actor of the round.
   */
  private async validateCombatTalent(
    action: Action,
    context: ManeuverContext,
    talent: CombatTalentPurpose,
    choices: CombatTalentChoices,
  ): Promise<void> {
    const firstRound = talent === 'battle-cry' ? await this.isFirstRound(action) : true;
    validateCombatTalentPurpose(context.actorRound, context.skill, talent, choices, { firstRound });
    if (choices.foeActorId) {
      const foe = await this.actorRoundRepository.findByActorIdAndRound(action.gameId, choices.foeActorId, action.round);
      if (!foe) throw new NotFoundError('Target actor', choices.foeActorId, 'err-maneuver-target-not-found');
    }
  }

  /** The actor has no actor round in an earlier round of the game. */
  private async isFirstRound(action: Action): Promise<boolean> {
    const earlier = await this.actorRoundRepository.findByRsql(
      `gameId==${action.gameId};actorId==${action.actorId};round<${action.round}`,
      0,
      1,
    );
    return earlier.content.length === 0;
  }

  /**
   * Trading (§14.2, workspace spec 022, decision 11): an opposed percent maneuver whose percent gives the price, 200%
   * less the result, between 50% and 200%. It takes no critical and adds no progress: a deal is struck in one roll.
   */
  private async resolvePrice(action: Action, total: number): Promise<void> {
    const result = await this.maneuverPort.percent(total);
    const percent = result.percent || 0;
    const price = Math.min(MAX_PRICE, Math.max(MIN_PRICE, PRICE_BASE - percent));
    const maneuverResult = new ActionManeuverResult(undefined, percent, result.message, undefined, null, true);
    maneuverResult.price = price;
    action.maneuver!.result = maneuverResult;
  }

  /**
   * Leadership (§14.2, §14.3, workspace spec 022, decision 10): its result is read on the morale table of core's
   * psychology tables, with the outcome key and the modifier to later morale rolls (a warning for the game master). An
   * unmodified 66 is the unusual event of the table.
   */
  private async resolveMorale(action: Action, total: number, unusualEvent: boolean): Promise<void> {
    const tables = await this.psychologyTables.find();
    const row = findBand(tables.morale, total);
    const result = new ActionManeuverResult(row?.result, undefined, undefined, [], undefined, undefined, unusualEvent || undefined);
    result.outcome = unusualEvent && tables.moraleUnusualEvent ? tables.moraleUnusualEvent.outcome : row?.outcome;
    result.moraleModifier = row?.moraleModifier ?? undefined;
    result.moraleModifierDays = row?.moraleModifierDays ?? undefined;
    action.maneuver!.result = result;
  }

  /**
   * Percent maneuver (M1, §4.4 of spec 010): the percent adds up to the progress the action inherited; a critical or
   * a failure to act adds nothing. A critical of a maneuver needing freedom of movement raises an alert, as movement.
   */
  private async resolvePercent(action: Action, context: ManeuverContext, total: number): Promise<ActorRoundAlert | null> {
    const result = await this.maneuverPort.percent(total);
    const critical = result.critical || null;
    const gained = critical ? 0 : result.percent || 0;
    const progress = (action.maneuver!.progress ?? 0) + gained;
    action.maneuver!.progress = progress;
    action.maneuver!.result = new ActionManeuverResult(
      undefined,
      result.percent,
      result.message,
      undefined,
      critical,
      progress >= COMPLETED_PERCENT,
    );
    if (critical && context.profile.movement) {
      return ActorRoundAlert.buildCritical(MOVING_MANEUVER_CRITICAL_TYPE, critical);
    }
    return null;
  }
}
