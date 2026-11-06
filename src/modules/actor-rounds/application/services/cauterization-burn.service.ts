import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { type CriticalTablePort, CRITICAL_TABLE_PORT } from '../../../actions/application/ports/critical-table.port.js';
import type { AttackLocation } from '../../../actions/domain/value-objects/attack-location.vo.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../domain/aggregates/actor-round.js';
import { CriticalInjuryFactory } from '../../domain/services/critical-injury.factory.js';
import type { TreatmentEffect } from '../../domain/services/injury-treatment.js';
import { ActorRoundEffect } from '../../domain/value-objects/actor-round-effect.vo.js';
import type { HpChange } from '../../domain/value-objects/hp-log-entry.vo.js';
import type { Injury, InjurySource } from '../../domain/value-objects/injury.vo.js';
import { elementalSeveritySteps } from '../../domain/services/elemental-talents.js';
import { adjustSeverity } from '../../../shared/domain/severity.js';

/** Table code of the heat criticals of a cauterization. */
const HEAT_CRITICAL_TABLE = 'H';
/** Severity of a burn whose critical Elemental Resistance took below A. */
const NO_CRITICAL = 'none';

const MIN_CRITICAL_ROLL = 1;
const MAX_CRITICAL_ROLL = 100;
const D10 = 10;

/** What a cauterization did to the patient besides the bleeding (Table 13-1c). */
export interface HeatResult {
  /** Severity of the heat critical; `none` when Elemental Resistance took it below A (workspace spec 079, D4). */
  critical: string;
  /** Workspace spec 079, D4: the severity of the treatment before Elemental Resistance or Susceptibility moved it. */
  originalCritical?: string;
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

export interface HeatRolls {
  heatHitsRoll?: number | null;
  heatCriticalRoll?: number | null;
}

/**
 * The burn of a cauterization (Table 13-1c, spec 013 D7): used by the treatment of the game master and by the
 * `medical` actions of workspace spec 068.
 */
@Injectable()
export class CauterizationBurnService {
  constructor(@Inject(CRITICAL_TABLE_PORT) private readonly criticalTable: CriticalTablePort) {}

  static validateRolls(rolls: HeatRolls): void {
    const critical = rolls.heatCriticalRoll;
    if (
      critical !== undefined &&
      critical !== null &&
      (!Number.isInteger(critical) || critical < MIN_CRITICAL_ROLL || critical > MAX_CRITICAL_ROLL)
    ) {
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
  async burn(
    patient: ActorRound,
    injury: Injury,
    effect: TreatmentEffect,
    rolls: HeatRolls,
    source: InjurySource,
  ): Promise<HeatResult | undefined> {
    if (!effect.heatCritical) {
      return undefined;
    }
    const dice = effect.heatHitsDice ?? 0;
    const hits = CauterizationBurnService.hits(dice, rolls.heatHitsRoll ?? undefined);
    const location = CauterizationBurnService.toAttackLocation(injury.location);
    // Workspace spec 079, D4: a fixed heat critical without an attack roll, moved by Elemental Resistance/Susceptibility
    const steps = elementalSeveritySteps(patient.traits, 'heat');
    const severity = steps ? adjustSeverity(effect.heatCritical, steps, true) : effect.heatCritical;
    const heat: HeatResult = {
      critical: severity ?? NO_CRITICAL,
      ...(steps ? { originalCritical: effect.heatCritical } : {}),
      hitsDice: dice,
      hits,
    };
    const hpChanges: HpChange[] = [{ kind: 'treatment', amount: -hits, injuryId: injury.id }];
    if (!severity) {
      patient.applyAttackResults(hits, undefined, undefined, undefined, [], hpChanges);
      return heat;
    }
    const criticalRoll = rolls.heatCriticalRoll ?? undefined;
    if (criticalRoll === undefined) {
      patient.applyAttackResults(hits, undefined, undefined, undefined, [], hpChanges);
      heat.alertId = patient.addHeatCriticalAlert(severity, location).id;
      return heat;
    }
    const critical = await this.criticalTable.lookup({
      criticalType: HEAT_CRITICAL_TABLE,
      criticalSeverity: severity,
      roll: criticalRoll,
      location,
    });
    const criticalKey = `${HEAT_CRITICAL_TABLE}-${severity}-${criticalRoll}`;
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
