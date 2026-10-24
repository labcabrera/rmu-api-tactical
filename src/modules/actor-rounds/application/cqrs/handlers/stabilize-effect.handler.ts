import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round';
import { InjuryTreatmentRules } from '../../../domain/services/injury-treatment';
import { DYING } from '../../../domain/value-objects/actor-round-effect.vo';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port';
import { MedicalRoll, MedicalRollService } from '../../services/medical-roll.service';
import { StabilizeEffectCommand } from '../commands/stabilize-effect.command';

export interface StabilizeEffectResult {
  actorRound: ActorRound;
  roll: MedicalRoll;
  /** Rounds the dying effect gained: 1 on a success, 2 on an absolute success. */
  roundsGained: number;
}

/** Stabilizing a dying actor (spec 013, §3), with a medium Medicine roll unless a difficulty is given. */
@CommandHandler(StabilizeEffectCommand)
export class StabilizeEffectHandler implements ICommandHandler<StabilizeEffectCommand, StabilizeEffectResult> {
  private readonly logger = new Logger(StabilizeEffectHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    private readonly medicalRollService: MedicalRollService,
  ) {}

  async execute(command: StabilizeEffectCommand): Promise<StabilizeEffectResult> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { patient } = await this.medicalRollService.loadPatient(command.actorRoundId);
    const effect = patient.effects.find(each => each.id === command.effectId);
    if (!effect) throw new NotFoundError('Effect', command.effectId, 'err-effect-not-found');
    if (effect.status !== DYING) throw new ValidationError(`Effect ${command.effectId} is not a dying effect`, 'err-effect-not-dying');
    const roll = await this.medicalRollService.roll(patient, command.healer, command.roll, command.difficulty ?? 0);
    const roundsGained = InjuryTreatmentRules.stabilizationRounds(roll.outcome.result);
    patient.stabilize(command.effectId, roundsGained);
    const updated = await this.actorRoundRepository.update(patient.id, patient);
    return { actorRound: updated, roll, roundsGained };
  }
}
