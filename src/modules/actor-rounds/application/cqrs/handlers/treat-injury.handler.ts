import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { type CriticalTablePort, CRITICAL_TABLE_PORT } from '../../../../actions/application/ports/critical-table.port.js';
import type { AttackLocation } from '../../../../actions/domain/value-objects/attack-location.vo.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { CriticalInjuryFactory } from '../../../domain/services/critical-injury.factory.js';
import { InjuryTreatmentRules, type TreatmentEffect } from '../../../domain/services/injury-treatment.js';
import { ActorRoundEffect } from '../../../domain/value-objects/actor-round-effect.vo.js';
import type { HpChange } from '../../../domain/value-objects/hp-log-entry.vo.js';
import type { Injury, InjurySource, InjuryTreatment } from '../../../domain/value-objects/injury.vo.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { type HealingTablesPort, HEALING_TABLES_PORT } from '../../ports/healing-tables.port.js';
import { type MedicalRoll, MedicalRollService } from '../../services/medical-roll.service.js';
import { TreatInjuryCommand } from '../commands/treat-injury.command.js';

/** Table code of the heat criticals of a cauterization. */
const HEAT_CRITICAL_TABLE = 'H';

const MIN_CRITICAL_ROLL = 1;
const MAX_CRITICAL_ROLL = 100;
const D10 = 10;

/** What a cauterization did to the patient besides the bleeding (Table 13-1c). */
export interface HeatResult {
  /** Severity of the heat critical. */
  critical: string;
  /** Number of d10 of extra hits, and the hits taken. */
  hitsDice: number;
  hits: number;
  /** The critical resolved with `heatCriticalRoll`: its roll, damage and the text of the critical table. */
  criticalRoll?: number;
  criticalDamage?: number;
  criticalText?: string;
  /** The critical left for the game master, without `heatCriticalRoll`. */
  alertId?: string;
}

export interface TreatInjuryResult {
  actorRound: ActorRound;
  injury: Injury;
  treatment: InjuryTreatment;
  roll: MedicalRoll;
  /** Severity of the heat critical of a cauterization. */
  heatCritical?: string;
  heat?: HeatResult;
  /** Unmodified 66 on a cauterization: the patient catches fire, a warning for the game master. */
  unusualEvent?: boolean;
}

/**
 * A medical procedure on an injury during a tactical game (spec 013, §3): the healer's Medicine roll against the
 * procedure's difficulty (core's treatment difficulty table, workspace spec 022, D4), resolved with the medical
 * maneuver table of core. A cauterization (D7) also burns the patient: the extra hits of its result and its heat
 * critical, resolved on the location of the injury when the client sends its roll. Registered in the actions module,
 * which has the maneuver and critical table ports.
 */
@CommandHandler(TreatInjuryCommand)
export class TreatInjuryHandler implements ICommandHandler<TreatInjuryCommand, TreatInjuryResult> {
  private readonly logger = new Logger(TreatInjuryHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    private readonly medicalRollService: MedicalRollService,
    @Inject(HEALING_TABLES_PORT) private readonly healingTables: HealingTablesPort,
    @Inject(CRITICAL_TABLE_PORT) private readonly criticalTable: CriticalTablePort,
  ) {}

  async execute(command: TreatInjuryCommand): Promise<TreatInjuryResult> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { patient, game } = await this.medicalRollService.loadPatient(command.actorRoundId);
    const injury = patient.findInjury(command.injuryId);
    InjuryTreatmentRules.validate(command.procedure, injury);
    TreatInjuryHandler.validateRolls(command);
    const difficulty =
      command.difficulty ?? InjuryTreatmentRules.defaultDifficulty(command.procedure, injury, await this.healingTables.treatmentTables());
    const roll = await this.medicalRollService.roll(patient, command.healer, command.roll, difficulty, {
      // Translation keys of the values, as the MFE labels them
      procedure: `procedure-${command.procedure}`,
      ...(injury
        ? { injuryType: `injury-type-${injury.type}`, severity: injury.severity, ...(injury.location ? { location: injury.location } : {}) }
        : {}),
      ...(command.difficulty === undefined || command.difficulty === null ? {} : { chosen: true }),
    });
    const treated = patient.treatInjury(
      command.injuryId,
      command.procedure,
      roll.outcome,
      { healer: roll.healer, difficulty, roll: roll.roll, total: roll.total },
      command.rolls.unmodifiedRoll ?? command.roll,
    );
    const source: InjurySource = { kind: 'critical', tacticalGameId: game.id, tacticalGameName: game.name, round: game.round };
    const heat = await this.burn(patient, treated.injury, treated.effect, command, source);
    const updated = await this.actorRoundRepository.update(patient);
    return {
      actorRound: updated,
      injury: treated.injury,
      treatment: treated.treatment,
      roll,
      heatCritical: treated.effect.heatCritical,
      heat,
      unusualEvent: treated.effect.unusualEvent,
    };
  }

  private static validateRolls(command: TreatInjuryCommand): void {
    const critical = command.rolls.heatCriticalRoll;
    if (critical !== undefined && (!Number.isInteger(critical) || critical < MIN_CRITICAL_ROLL || critical > MAX_CRITICAL_ROLL)) {
      throw new ValidationError(
        `The heat critical roll goes from ${MIN_CRITICAL_ROLL} to ${MAX_CRITICAL_ROLL}`,
        'err-treatment-invalid-roll',
      );
    }
  }

  /**
   * Table 13-1c: the extra hits (the d10 of the result, the client's sum or rolled here) and the heat critical. With
   * its roll, the critical is looked up on the location of the injury (the critical tables step down to the next lower
   * result of that location) and applied as an attack critical; without it, it is an alert with the location.
   */
  private async burn(
    patient: ActorRound,
    injury: Injury,
    effect: TreatmentEffect,
    command: TreatInjuryCommand,
    source: InjurySource,
  ): Promise<HeatResult | undefined> {
    if (!effect.heatCritical) {
      return undefined;
    }
    const dice = effect.heatHitsDice ?? 0;
    const hits = TreatInjuryHandler.hits(dice, command.rolls.heatHitsRoll);
    const location = TreatInjuryHandler.toAttackLocation(injury.location);
    const heat: HeatResult = { critical: effect.heatCritical, hitsDice: dice, hits };
    const hpChanges: HpChange[] = [{ kind: 'treatment', amount: -hits, injuryId: injury.id }];
    const criticalRoll = command.rolls.heatCriticalRoll;
    if (criticalRoll === undefined) {
      patient.applyAttackResults(hits, undefined, undefined, undefined, [], hpChanges);
      heat.alertId = patient.addHeatCriticalAlert(effect.heatCritical, location).id;
      return heat;
    }
    const critical = await this.criticalTable.lookup({
      criticalType: HEAT_CRITICAL_TABLE,
      criticalSeverity: effect.heatCritical,
      roll: criticalRoll,
      location,
    });
    const criticalKey = `${HEAT_CRITICAL_TABLE}-${effect.heatCritical}-${criticalRoll}`;
    const criticalSource: InjurySource = { ...source, criticalKey };
    const built = CriticalInjuryFactory.build({
      effects: critical.effects,
      criticalType: HEAT_CRITICAL_TABLE,
      location: critical.location || injury.location,
      side: injury.side,
      injury: critical.injury,
      source: criticalSource,
    });
    const effects = built.effects.map(
      e => new ActorRoundEffect(randomUUID(), e.status, e.value, e.rounds, undefined, undefined, undefined, undefined, criticalSource),
    );
    hpChanges.push({ kind: 'critical', amount: -critical.damage, criticalKey });
    patient.applyAttackResults(hits + critical.damage, effects, location, undefined, built.injuries, hpChanges);
    return { ...heat, criticalRoll, criticalDamage: critical.damage, criticalText: critical.text };
  }

  /** The client's sum of `dice` d10, which has to be a possible one, or a roll made here. */
  private static hits(dice: number, roll: number | undefined): number {
    if (dice === 0) {
      return 0;
    }
    if (roll === undefined) {
      return Array.from({ length: dice }, () => Math.floor(Math.random() * D10) + 1).reduce((sum, die) => sum + die, 0);
    }
    if (!Number.isInteger(roll) || roll < dice || roll > dice * D10) {
      throw new ValidationError(`The extra hits are ${dice}d10: from ${dice} to ${dice * D10}`, 'err-treatment-invalid-roll');
    }
    return roll;
  }

  private static toAttackLocation(location: Injury['location']): AttackLocation | undefined {
    if (!location) return undefined;
    return location === 'arm' ? 'arms' : location === 'leg' ? 'legs' : location;
  }
}
