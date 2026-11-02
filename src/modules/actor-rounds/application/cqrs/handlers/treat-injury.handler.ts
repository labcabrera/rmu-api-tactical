import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { InjuryTreatmentRules } from '../../../domain/services/injury-treatment.js';
import type { Injury, InjurySource, InjuryTreatment } from '../../../domain/value-objects/injury.vo.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { type HealingTablesPort, HEALING_TABLES_PORT } from '../../ports/healing-tables.port.js';
import { CauterizationBurnService, type HeatResult } from '../../services/cauterization-burn.service.js';
import { type MedicalRoll, MedicalRollService } from '../../services/medical-roll.service.js';
import { TreatInjuryCommand } from '../commands/treat-injury.command.js';

export type { HeatResult } from '../../services/cauterization-burn.service.js';

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
 * critical, resolved on the location of the injury when the client sends its roll. Since workspace spec 068 this is
 * the game master's adjustment (no AP, instantaneous): in combat the healer declares a `medical` action. Registered in
 * the actions module, which has the maneuver and critical table ports.
 */
@CommandHandler(TreatInjuryCommand)
export class TreatInjuryHandler implements ICommandHandler<TreatInjuryCommand, TreatInjuryResult> {
  private readonly logger = new Logger(TreatInjuryHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    private readonly medicalRollService: MedicalRollService,
    @Inject(HEALING_TABLES_PORT) private readonly healingTables: HealingTablesPort,
    private readonly burnService: CauterizationBurnService,
  ) {}

  async execute(command: TreatInjuryCommand): Promise<TreatInjuryResult> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { patient, game } = await this.medicalRollService.loadPatient(command.actorRoundId);
    const injury = patient.findInjury(command.injuryId);
    const rules = await this.healingTables.combatRules();
    InjuryTreatmentRules.validate(command.procedure, injury, rules);
    CauterizationBurnService.validateRolls(command.rolls);
    InjuryTreatmentRules.validateSalve(command.procedure, command.rolls.salveModifier, rules);
    const difficulty =
      command.difficulty ?? InjuryTreatmentRules.defaultDifficulty(command.procedure, injury, await this.healingTables.treatmentTables());
    const roll = await this.medicalRollService.roll(patient, command.healer, command.roll, difficulty, {
      // Translation keys of the values, as the MFE labels them
      procedure: `procedure-${command.procedure}`,
      ...(injury
        ? {
            injuryType: `injury-type-${injury.type}`,
            severity: `injury-severity-${injury.severity}`,
            ...(injury.location ? { location: injury.location } : {}),
          }
        : {}),
      ...(command.difficulty === undefined || command.difficulty === null ? {} : { chosen: true }),
    });
    const treated = patient.treatInjury(
      command.injuryId,
      command.procedure,
      roll.outcome,
      { healer: roll.healer, difficulty, roll: roll.roll, total: roll.total },
      {
        unmodifiedRoll: command.rolls.unmodifiedRoll ?? command.roll,
        total: roll.total,
        rules,
        castSupport: command.rolls.castSupport,
        salveModifier: command.rolls.salveModifier,
      },
    );
    const source: InjurySource = { kind: 'critical', tacticalGameId: game.id, tacticalGameName: game.name, round: game.round };
    const heat = await this.burnService.burn(patient, treated.injury, treated.effect, command.rolls, source);
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
}
