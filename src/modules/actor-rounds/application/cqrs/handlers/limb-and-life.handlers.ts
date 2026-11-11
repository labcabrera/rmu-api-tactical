import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { KeyValueModifier } from '../../../../actions/domain/value-objects/key-value-modifier.vo.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import {
  AMPUTATION_RULE,
  EMERGENCY_AMPUTATION_DIFFICULTY,
  LimbAndLifeRules,
  REVIVE_RULE,
  SYSTEM_SHOCK_DICE,
} from '../../../domain/services/limb-and-life-rules.js';
import { ActorRoundAlert } from '../../../domain/value-objects/actor-round-alert.vo.js';
import type { InjurySource } from '../../../domain/value-objects/injury.vo.js';
import type { LostLimb } from '../../../domain/value-objects/lost-limb.vo.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { type MedicalRoll, MedicalRollService } from '../../services/medical-roll.service.js';
import { AmputateLimbCommand, ReviveActorCommand } from '../commands/limb-and-life.commands.js';

/** The difficulty of the breakdown with the rule of the procedure instead of the generic one. */
const withRule = (roll: MedicalRoll, rule: string): void => {
  const index = roll.breakdown.findIndex(modifier => modifier.key === 'difficulty');
  if (index < 0) return;
  const current = roll.breakdown[index];
  roll.breakdown[index] = new KeyValueModifier(current.key, current.value, current.group, current.source, rule, current.params);
};

export interface AmputateLimbResult {
  actorRound: ActorRound;
  roll: MedicalRoll;
  lostLimb: LostLimb;
  /** Ids of the injuries of the stump */
  injuryIds: string[];
  /** Failure: the alert of the critical of the stump (S, D, one result lower) */
  criticalAlertId?: string;
  /** Absolute failure: rounds of the dying effect of system shock */
  dyingRounds?: number;
}

export interface ReviveActorResult {
  actorRound: ActorRound;
  roll: MedicalRoll;
  revived: boolean;
  /** Dangerous defibrillation: severity of the electricity critical left as an alert, and the hits taken */
  shock?: { criticalSeverity: string; hitsDice: number; hits: number; alertId: string };
}

/**
 * Workspace spec 079, C1 (§13.1): an emergency amputation in combat (tourniquet, cut and cauterize, -30), a game master
 * adjustment like the treatments. The limb is lost whatever the result and the stump heals as -40 bone, muscle, skin and
 * burn injuries. A failure leaves the critical of the stump as an alert; an absolute failure is system shock, dying in
 * 2d10 rounds. Registered in the actions module, which has the maneuver port.
 */
@CommandHandler(AmputateLimbCommand)
export class AmputateLimbHandler implements ICommandHandler<AmputateLimbCommand, AmputateLimbResult> {
  private readonly logger = new Logger(AmputateLimbHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    private readonly medicalRollService: MedicalRollService,
  ) {}

  async execute(command: AmputateLimbCommand): Promise<AmputateLimbResult> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { patient, game } = await this.medicalRollService.loadPatient(command.actorRoundId);
    if (command.injuryId) patient.findInjury(command.injuryId);
    const difficulty = command.difficulty ?? EMERGENCY_AMPUTATION_DIFFICULTY;
    const roll = await this.medicalRollService.roll(patient, command.healer, command.roll, difficulty, {
      procedure: 'amputation-emergency',
      location: command.location,
      ...(command.difficulty === undefined || command.difficulty === null ? {} : { chosen: true }),
    });
    withRule(roll, AMPUTATION_RULE);
    const result = roll.outcome.result;
    const source: InjurySource = { kind: 'manual', tacticalGameId: game.id, tacticalGameName: game.name, round: game.round };
    const stump = LimbAndLifeRules.stumpInjuries(command.location, command.side, source);
    const dyingRounds = result === 'absolute-failure' ? LimbAndLifeRules.d10(SYSTEM_SHOCK_DICE, command.systemShockRoll) : undefined;
    const alertsBefore = new Set(patient.alerts.map(alert => alert.id));
    const lostLimb = patient.amputate(
      { location: command.location, side: command.side, ...(command.injuryId ? { injuryId: command.injuryId } : {}) },
      stump,
      { critical: result === 'failure', dyingRounds },
      source,
    );
    const criticalAlert = patient.alerts.find(alert => !alertsBefore.has(alert.id) && alert.type === 'critical');
    const updated = await this.actorRoundRepository.update(patient);
    return {
      actorRound: updated,
      roll,
      lostLimb,
      injuryIds: stump.map(injury => injury.id),
      ...(criticalAlert ? { criticalAlertId: criticalAlert.id } : {}),
      ...(dyingRounds ? { dyingRounds } : {}),
    };
  }
}

/**
 * Workspace spec 079, C6 (§13.2 Reviving a Body): a Medicine maneuver on a dead body, at -50 for a respiratory arrest,
 * -100 for a cardiac one and -20 to -70 for a defibrillation. Refused when the actor is not dead, its soul has departed
 * (60 rounds) or its hits are still beyond the death threshold. A success turns dead into unconscious; a defibrillation
 * also on a partial success, and a dangerous source shocks the patient (an L critical left as an alert and its hits).
 */
@CommandHandler(ReviveActorCommand)
export class ReviveActorHandler implements ICommandHandler<ReviveActorCommand, ReviveActorResult> {
  private readonly logger = new Logger(ReviveActorHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    private readonly medicalRollService: MedicalRollService,
  ) {}

  async execute(command: ReviveActorCommand): Promise<ReviveActorResult> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { patient, game } = await this.medicalRollService.loadPatient(command.actorRoundId);
    patient.checkRevivable();
    const difficulty = LimbAndLifeRules.reviveDifficulty(command.method, command.defibrillationDifficulty);
    const roll = await this.medicalRollService.roll(patient, command.healer, command.roll, difficulty, {
      procedure: `revive-${command.method}`,
    });
    withRule(roll, REVIVE_RULE);
    const result = roll.outcome.result;
    const source: InjurySource = { kind: 'manual', tacticalGameId: game.id, tacticalGameName: game.name, round: game.round };
    const revived = LimbAndLifeRules.revives(command.method, result);
    if (revived) patient.revive(source);
    let shock: ReviveActorResult['shock'];
    const danger = command.method === 'defibrillation' && command.dangerousSource ? LimbAndLifeRules.defibrillationShock(result) : null;
    if (danger) {
      const hits = LimbAndLifeRules.d10(danger.dice, command.shockHitsRoll);
      const alert = ActorRoundAlert.buildDefibrillationCritical(danger.severity);
      patient.alerts.push(alert);
      patient.takeShockHits(hits);
      shock = { criticalSeverity: danger.severity, hitsDice: danger.dice, hits, alertId: alert.id };
    }
    const updated = await this.actorRoundRepository.update(patient);
    return { actorRound: updated, roll, revived, ...(shock ? { shock } : {}) };
  }
}
