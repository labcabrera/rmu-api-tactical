import { Inject, Injectable } from '@nestjs/common';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { type HealingTablesPort, HEALING_TABLES_PORT } from '../../../../actor-rounds/application/ports/healing-tables.port.js';
import { CauterizationBurnService } from '../../../../actor-rounds/application/services/cauterization-burn.service.js';
import { MedicalRollService } from '../../../../actor-rounds/application/services/medical-roll.service.js';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { InjuryTreatmentRules, type TacticalProcedure } from '../../../../actor-rounds/domain/services/injury-treatment.js';
import type { CastSupport, InjurySource, TreatmentProcedure } from '../../../../actor-rounds/domain/value-objects/injury.vo.js';
import type { HealingCombatRules } from '../../../../actor-rounds/domain/value-objects/treatment-difficulty.vo.js';
import { Game } from '../../../../games/domain/aggregates/game.js';
import { openEndedRoll } from '../../../../psychology/domain/services/open-ended-roll.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Action } from '../../../domain/aggregates/action.js';
import {
  type ActionMedical,
  HERBALISM_BONUS,
  MEDICAL_ACTION_RULES,
  MEDICAL_AP_PER_ROUND,
  type MedicalHerbalism,
  type MedicalStepResult,
} from '../../../domain/value-objects/action-medical.vo.js';
import { DIFFICULTY_MAP, type Difficulty } from '../../../domain/value-objects/difficulty.vo.js';
import { KeyValueModifier } from '../../../domain/value-objects/key-value-modifier.vo.js';

/** Skill of a herb that helps a treatment (strategic skill id). */
export const HERBALISM_SKILL_ID = 'herbalism';

/** Absolute maneuver results that count as a success of the Herbalism roll. */
const HERBALISM_SUCCESS = ['success', 'absolute-success'];

/** What a `medical` action is declared with (workspace spec 068, §2). */
export interface MedicalDeclaration {
  patientActorId: string;
  injuryId?: string | null;
  effectId?: string | null;
  procedure: TreatmentProcedure;
  rounds?: number | null;
  roll?: number | null;
  unmodifiedRoll?: number | null;
  difficulty?: Difficulty | null;
  herbalism?: { roll?: number | null; itemId?: string | null } | null;
  castSupport?: CastSupport | null;
  salveModifier?: number | null;
  heatHitsRoll?: number | null;
  heatCriticalRoll?: number | null;
}

/** What the resolution of one round of a `medical` action receives (rolls the declaration did not send). */
export interface MedicalResolution {
  roll?: number | null;
  unmodifiedRoll?: number | null;
  heatHitsRoll?: number | null;
  heatCriticalRoll?: number | null;
  herbalismRoll?: number | null;
}

export interface MedicalResolveResult {
  /** Patient actor round, changed; the same object as the healer's when it treats itself. */
  patient: ActorRound;
  /** The healer's actor round changed (a herb consumed). */
  healerChanged: boolean;
  step: MedicalStepResult;
}

/**
 * The `medical` actions of workspace spec 068 (decisions 1 to 7): their declaration (what the healer and the patient
 * must be, the procedure and its rounds) and the resolution of each round of 4 AP. The Medicine roll is made in the
 * first round and kept in the injury (`treatmentInProgress`); the treatment is applied when the last round is
 * resolved. `stabilize` rolls every round on a dying effect.
 */
@Injectable()
export class MedicalActionService {
  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(HEALING_TABLES_PORT) private readonly healingTables: HealingTablesPort,
    private readonly medicalRolls: MedicalRollService,
    private readonly burnService: CauterizationBurnService,
  ) {}

  /** The patient's actor round of the round: the healer's one when it treats itself. */
  async patientOf(healer: ActorRound, patientActorId: string): Promise<ActorRound> {
    if (patientActorId === healer.actorId) {
      return healer;
    }
    const patient = await this.actorRoundRepository.findByActorIdAndRound(healer.gameId, patientActorId, healer.round);
    if (!patient) {
      throw new NotFoundError('Patient actor', patientActorId, 'err-patient-not-found');
    }
    return patient;
  }

  /** Checks a new `medical` action and builds its data, `originActionId` being the new action's id. */
  async declare(healer: ActorRound, declaration: MedicalDeclaration | null | undefined, actionId: string): Promise<ActionMedical> {
    if (!declaration || !declaration.patientActorId || !declaration.procedure) {
      throw new ValidationError('A medical action needs its patient and procedure', 'err-medical-required');
    }
    if (!healer.canHeal()) {
      throw new ValidationError(`Healer ${healer.actorName} is not able to treat`, 'err-healer-not-able');
    }
    const patient = await this.patientOf(healer, declaration.patientActorId);
    const rules = await this.healingTables.combatRules();
    const procedure = declaration.procedure;
    let injury;
    if (procedure === 'stabilize') {
      if (!declaration.effectId) {
        throw new ValidationError('Stabilizing needs the dying effect', 'err-effect-not-dying');
      }
      patient.findDying(declaration.effectId);
    } else {
      if (!declaration.injuryId) {
        throw new NotFoundError('Injury', 'null', 'err-injury-not-found');
      }
      injury = patient.findInjury(declaration.injuryId);
      InjuryTreatmentRules.validate(procedure as TacticalProcedure, injury, rules);
      InjuryTreatmentRules.validateSalve(procedure, declaration.salveModifier, rules);
      if (injury.treatmentInProgress) {
        throw new ValidationError(`Injury ${injury.id} is already being treated`, 'err-treatment-in-progress');
      }
    }
    const override = typeof declaration.rounds === 'number' && Number.isInteger(declaration.rounds) && declaration.rounds >= 1;
    if (declaration.rounds !== undefined && declaration.rounds !== null && !override) {
      throw new ValidationError('The rounds of a medical action are a whole number from 1', 'err-medical-invalid-rounds');
    }
    const rounds = override ? declaration.rounds! : InjuryTreatmentRules.durationRounds(procedure, injury, rules);
    return {
      patientActorId: declaration.patientActorId,
      injuryId: procedure === 'stabilize' ? null : declaration.injuryId!,
      effectId: procedure === 'stabilize' ? declaration.effectId! : null,
      procedure,
      rounds,
      ...(override ? { roundsOverride: true } : {}),
      roll: declaration.roll ?? null,
      unmodifiedRoll: declaration.unmodifiedRoll ?? null,
      difficulty: declaration.difficulty ?? null,
      herbalism: declaration.herbalism ? { roll: declaration.herbalism.roll ?? null, itemId: declaration.herbalism.itemId ?? null } : null,
      castSupport: declaration.castSupport ?? null,
      salveModifier: declaration.salveModifier ?? null,
      heatHitsRoll: declaration.heatHitsRoll ?? null,
      heatCriticalRoll: declaration.heatCriticalRoll ?? null,
      originActionId: actionId,
      startedRound: null,
      resolvedSteps: 0,
      state: 'pending',
      results: [],
    };
  }

  /** Rounds of 4 AP the action has reached with its AP (carried ones included), up to its rounds. */
  static dueSteps(action: Action, healer: ActorRound, phase: number): number {
    const medical = action.medical!;
    return Math.min(medical.rounds, Math.floor(action.apOf(healer, phase) / MEDICAL_AP_PER_ROUND));
  }

  /**
   * Resolves the next round of the action: the first one rolls Medicine and starts the treatment (stabilize rolls each
   * round); the last one applies it. The caller closes the action when `medical.state` is `completed`.
   */
  async resolve(action: Action, healer: ActorRound, game: Game, phase: number, input: MedicalResolution): Promise<MedicalResolveResult> {
    const medical = action.medical!;
    if (medical.state === 'completed' || medical.state === 'aborted') {
      throw new ValidationError(`Medical action ${action.id} is ${medical.state}`, 'err-action-closed');
    }
    if (!healer.canHeal()) {
      throw new ValidationError(`Healer ${healer.actorName} is not able to treat`, 'err-healer-not-able');
    }
    const due = MedicalActionService.dueSteps(action, healer, phase);
    const nothingDue =
      medical.procedure === 'stabilize' || medical.state === 'pending' ? due <= medical.resolvedSteps : due < medical.rounds;
    if (nothingDue) {
      throw new ValidationError(
        `The medical action has no round of ${MEDICAL_AP_PER_ROUND} AP left to resolve now`,
        'err-medical-already-resolved',
        { resolvedSteps: medical.resolvedSteps, rounds: medical.rounds },
      );
    }
    const patient = await this.patientOf(healer, medical.patientActorId);
    const rules = await this.healingTables.combatRules();
    if (medical.procedure === 'stabilize') {
      return this.stabilizeStep(action, healer, patient, rules, game, input);
    }
    const step: MedicalStepResult = { round: game.round, step: medical.resolvedSteps + 1 };
    let healerChanged = false;
    if (medical.state === 'pending') {
      healerChanged = await this.startTreatment(action, healer, patient, rules, game, input, step);
    }
    medical.resolvedSteps = Math.max(medical.resolvedSteps, due, 1);
    if (medical.resolvedSteps >= medical.rounds) {
      await this.completeTreatment(action, patient, rules, game, input, step);
    }
    medical.results.push(step);
    return { patient, healerChanged, step };
  }

  /** The Medicine roll of the first round (decision 3), with the Herbalism of the herb that helps (decision 7). */
  private async startTreatment(
    action: Action,
    healer: ActorRound,
    patient: ActorRound,
    rules: HealingCombatRules,
    game: Game,
    input: MedicalResolution,
    step: MedicalStepResult,
  ): Promise<boolean> {
    const medical = action.medical!;
    const injury = patient.findInjury(medical.injuryId!);
    const procedure = medical.procedure as TacticalProcedure;
    InjuryTreatmentRules.validate(procedure, injury, rules);
    CauterizationBurnService.validateRolls(this.heatRolls(medical, input));
    const difficulty =
      (medical.difficulty ? DIFFICULTY_MAP.get(medical.difficulty) : undefined) ??
      InjuryTreatmentRules.defaultDifficulty(procedure, injury, await this.healingTables.treatmentTables());
    const extra: KeyValueModifier[] = [];
    let healerChanged = false;
    if (medical.herbalism) {
      const herbalism = await this.herbalism(healer, medical.herbalism, input.herbalismRoll);
      medical.herbalism = herbalism;
      if (herbalism.success) {
        extra.push(
          new KeyValueModifier('herbalism', herbalism.bonus!, 'situation', 'herbalism', MEDICAL_ACTION_RULES.herbalism, {
            roll: herbalism.roll!,
            total: herbalism.total!,
          }),
        );
      }
      if (herbalism.itemId) {
        healer.recordItemConsumed(herbalism.itemId, 1);
        healerChanged = healer !== patient;
      }
    }
    const rolled = this.medicineRoll(medical, input);
    const roll = await this.medicalRolls.roll(
      patient,
      { healerActorId: action.actorId },
      rolled.roll,
      difficulty,
      {
        procedure: `procedure-${procedure}`,
        injuryType: `injury-type-${injury.type}`,
        severity: `injury-severity-${injury.severity}`,
        ...(injury.location ? { location: injury.location } : {}),
        ...(medical.difficulty ? { chosen: true } : {}),
      },
      extra,
    );
    medical.unmodifiedRoll = rolled.unmodified;
    patient.startTreatment(injury.id, {
      actionId: medical.originActionId,
      healerActorId: action.actorId,
      procedure,
      startedRound: game.round,
      rounds: medical.rounds,
      roll: roll.roll,
      total: roll.total,
      result: roll.outcome.result,
      recoveryModifier: roll.outcome.recoveryModifier,
      injuryPenalty: roll.outcome.injuryPenalty,
      difficulty,
      healer: roll.healer,
      unmodifiedRoll: rolled.unmodified,
      ...(medical.castSupport ? { castSupport: medical.castSupport } : {}),
      ...(typeof medical.salveModifier === 'number' ? { salveModifier: medical.salveModifier } : {}),
    });
    medical.state = 'in-progress';
    medical.startedRound = game.round;
    step.roll = roll.roll;
    step.total = roll.total;
    step.result = roll.outcome.result;
    step.breakdown = [
      ...roll.breakdown,
      new KeyValueModifier('rounds', medical.rounds, 'situation', 'duration', MEDICAL_ACTION_RULES.duration, {
        procedure,
        ...(medical.roundsOverride ? { chosen: true } : {}),
      }),
    ];
    return healerChanged;
  }

  /** The last round applies the treatment rolled in the first one, and a cauterization burns (Table 13-1c). */
  private async completeTreatment(
    action: Action,
    patient: ActorRound,
    rules: HealingCombatRules,
    game: Game,
    input: MedicalResolution,
    step: MedicalStepResult,
  ): Promise<void> {
    const medical = action.medical!;
    const done = patient.completeTreatment(medical.originActionId, {
      rules,
      castSupport: medical.castSupport ?? undefined,
      salveModifier: medical.salveModifier ?? undefined,
    });
    medical.state = 'completed';
    step.completed = true;
    if (!done) {
      return;
    }
    const source: InjurySource = { kind: 'critical', tacticalGameId: game.id, tacticalGameName: game.name, round: game.round };
    const heat = await this.burnService.burn(patient, done.injury, done.effect, this.heatRolls(medical, input), source);
    if (heat) {
      step.heatCritical = heat.critical;
      step.heatHits = heat.hits;
    }
  }

  /** A stabilize round (decision 6): a Medicine roll of core's difficulty that adds rounds to the dying effect. */
  private async stabilizeStep(
    action: Action,
    healer: ActorRound,
    patient: ActorRound,
    rules: HealingCombatRules,
    game: Game,
    input: MedicalResolution,
  ): Promise<MedicalResolveResult> {
    const medical = action.medical!;
    patient.findDying(medical.effectId!);
    const difficulty =
      (medical.difficulty ? DIFFICULTY_MAP.get(medical.difficulty) : undefined) ??
      DIFFICULTY_MAP.get(rules.stabilize.difficulty as Difficulty) ??
      0;
    // The roll of the declaration is the first round's; the next ones roll their own
    const rolled = this.medicineRoll(medical.resolvedSteps === 0 ? medical : { roll: null, unmodifiedRoll: null }, input);
    const roll = await this.medicalRolls.roll(patient, { healerActorId: action.actorId }, rolled.roll, difficulty, {
      procedure: 'stabilize',
      ...(medical.difficulty ? { chosen: true } : {}),
    });
    const gained = InjuryTreatmentRules.stabilizationRounds(roll.outcome.result, rules.stabilize);
    const before = patient.effects.length;
    patient.stabilize(medical.effectId!, gained);
    const removed = patient.effects.length < before;
    medical.resolvedSteps += 1;
    medical.state = removed || medical.resolvedSteps >= medical.rounds ? 'completed' : 'in-progress';
    medical.startedRound = medical.startedRound ?? game.round;
    const step: MedicalStepResult = {
      round: game.round,
      step: medical.resolvedSteps,
      roll: roll.roll,
      total: roll.total,
      result: roll.outcome.result,
      breakdown: [
        ...roll.breakdown,
        new KeyValueModifier('stabilize', removed ? 0 : gained, 'situation', 'stabilize', MEDICAL_ACTION_RULES.stabilize, {
          ...(removed ? { causeTreated: true } : {}),
        }),
      ],
      roundsGained: removed ? 0 : gained,
      ...(removed ? { removed } : {}),
      ...(medical.state === 'completed' ? { completed: true } : {}),
    };
    medical.results.push(step);
    return { patient, healerChanged: false, step };
  }

  /** The Herbalism roll of the healer: a success gives +25 to the Medicine roll (decision 7). */
  private async herbalism(healer: ActorRound, herbalism: MedicalHerbalism, roll: number | null | undefined): Promise<MedicalHerbalism> {
    const rolled = roll ?? herbalism.roll ?? openEndedRoll().roll;
    const bonus = await this.medicalRolls.skillBonus(healer, HERBALISM_SKILL_ID);
    const total = rolled + bonus;
    const result = await this.medicalRolls.absolute(total);
    const success = HERBALISM_SUCCESS.includes(result);
    return { ...herbalism, roll: rolled, total, success, bonus: success ? HERBALISM_BONUS : 0 };
  }

  /** The Medicine roll: the resolution's, the declaration's, or rolled by the server (open-ended d100). */
  private medicineRoll(
    medical: Pick<ActionMedical, 'roll' | 'unmodifiedRoll'>,
    input: MedicalResolution,
  ): { roll: number; unmodified: number | undefined } {
    const sent = input.roll ?? medical.roll;
    if (typeof sent === 'number') {
      return { roll: sent, unmodified: input.unmodifiedRoll ?? medical.unmodifiedRoll ?? sent };
    }
    const rolled = openEndedRoll();
    return { roll: rolled.roll, unmodified: rolled.unmodified };
  }

  private heatRolls(medical: ActionMedical, input: MedicalResolution) {
    return {
      heatHitsRoll: input.heatHitsRoll ?? medical.heatHitsRoll ?? null,
      heatCriticalRoll: input.heatCriticalRoll ?? medical.heatCriticalRoll ?? null,
    };
  }
}
