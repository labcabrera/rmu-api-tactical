import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ActorRound } from '../../../domain/aggregates/actor-round';
import { InjuryTreatmentRules } from '../../../domain/services/injury-treatment';
import type { Injury, InjuryTreatment } from '../../../domain/value-objects/injury.vo';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port';
import { MedicalRoll, MedicalRollService } from '../../services/medical-roll.service';
import { TreatInjuryCommand } from '../commands/treat-injury.command';

export interface TreatInjuryResult {
  actorRound: ActorRound;
  injury: Injury;
  treatment: InjuryTreatment;
  roll: MedicalRoll;
  /** Severity of the heat critical a cauterization left for the game master. */
  heatCritical?: string;
}

/**
 * A medical procedure on an injury during a tactical game (spec 013, §3): the healer's Medicine roll against the
 * procedure's difficulty, resolved with the medical maneuver table of core. Registered in the actions module, which has
 * the maneuver port.
 */
@CommandHandler(TreatInjuryCommand)
export class TreatInjuryHandler implements ICommandHandler<TreatInjuryCommand, TreatInjuryResult> {
  private readonly logger = new Logger(TreatInjuryHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    private readonly medicalRollService: MedicalRollService,
  ) {}

  async execute(command: TreatInjuryCommand): Promise<TreatInjuryResult> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { patient } = await this.medicalRollService.loadPatient(command.actorRoundId);
    const injury = patient.findInjury(command.injuryId);
    InjuryTreatmentRules.validate(command.procedure, injury);
    const difficulty = command.difficulty ?? InjuryTreatmentRules.defaultDifficulty(command.procedure, injury);
    const roll = await this.medicalRollService.roll(patient, command.healer, command.roll, difficulty);
    const treated = patient.treatInjury(command.injuryId, command.procedure, roll.outcome, {
      healer: roll.healer,
      difficulty,
      roll: roll.roll,
      total: roll.total,
    });
    const updated = await this.actorRoundRepository.update(patient.id, patient);
    return { actorRound: updated, injury: treated.injury, treatment: treated.treatment, roll, heatCritical: treated.effect.heatCritical };
  }
}
