import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { DIFFICULTY_MAP, type Difficulty } from '../../../../actions/domain/value-objects/difficulty.vo.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { InjuryTreatmentRules } from '../../../domain/services/injury-treatment.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { type HealingTablesPort, HEALING_TABLES_PORT } from '../../ports/healing-tables.port.js';
import { type MedicalRoll, MedicalRollService } from '../../services/medical-roll.service.js';
import { StabilizeEffectCommand } from '../commands/stabilize-effect.command.js';

export interface StabilizeEffectResult {
  actorRound: ActorRound;
  roll: MedicalRoll;
  /** Rounds the dying effect gained: 1 on a success, 2 on an absolute success. */
  roundsGained: number;
  /** Workspace spec 068: the cause was treated and the success removed the dying effect. */
  removed?: boolean;
}

/**
 * Stabilizing a dying actor (spec 013, §3), with a Medicine roll of core's stabilize difficulty (medium by default)
 * unless a difficulty is given. Since workspace spec 068 it is the game master's adjustment: in combat it is a
 * `medical` action with the `stabilize` procedure.
 */
@CommandHandler(StabilizeEffectCommand)
export class StabilizeEffectHandler implements ICommandHandler<StabilizeEffectCommand, StabilizeEffectResult> {
  private readonly logger = new Logger(StabilizeEffectHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    private readonly medicalRollService: MedicalRollService,
    @Inject(HEALING_TABLES_PORT) private readonly healingTables: HealingTablesPort,
  ) {}

  async execute(command: StabilizeEffectCommand): Promise<StabilizeEffectResult> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { patient } = await this.medicalRollService.loadPatient(command.actorRoundId);
    patient.findDying(command.effectId);
    const rules = (await this.healingTables.combatRules()).stabilize;
    const difficulty = command.difficulty ?? DIFFICULTY_MAP.get(rules.difficulty as Difficulty) ?? 0;
    const roll = await this.medicalRollService.roll(patient, command.healer, command.roll, difficulty, {
      procedure: 'stabilize',
    });
    const roundsGained = InjuryTreatmentRules.stabilizationRounds(roll.outcome.result, rules);
    const before = patient.effects.length;
    patient.stabilize(command.effectId, roundsGained);
    const removed = patient.effects.length < before;
    const updated = await this.actorRoundRepository.update(patient);
    return { actorRound: updated, roll, roundsGained: removed ? 0 : roundsGained, ...(removed ? { removed } : {}) };
  }
}
