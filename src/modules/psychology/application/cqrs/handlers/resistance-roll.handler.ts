import { Inject, Logger } from '@nestjs/common';
import { temporaryModifierLines } from '../../../../actor-rounds/domain/value-objects/temporary-modifier.vo.js';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { ResistanceRollCalculator, type ResistanceRollResult } from '../../../domain/services/resistance-roll.calculator.js';
import { type PsychologyTablesPort, PSYCHOLOGY_TABLES_PORT } from '../../ports/psychology-tables.port.js';
import { ResistanceRollCommand } from '../commands/resistance-roll.command.js';
import { Game } from '../../../../games/domain/aggregates/game.js';

/** Alerts an RR answers (workspace spec 087; the individual fear alerts of workspace spec 100). */
const RR_ALERTS: string[] = ['frenzy-dying', 'revulsion-rr', 'fear-surrounded', 'fear-alone'];

export interface ActorResistanceRoll {
  actorRound: ActorRound;
  bonus: number;
  attackLevel: number;
  result: ResistanceRollResult;
}

/**
 * A resistance roll of an actor (workspace spec 022, decision 8): its bonus of the kind from its sheet (or the game
 * master's), the roll and the modifiers against the attack level, resolved with core's psychology tables. It changes
 * nothing (the fear checks of a group put the effects), except the RR of a frenzy-dying actor (spec 040), which kills
 * it when failed.
 */
@CommandHandler(ResistanceRollCommand)
export class ResistanceRollHandler implements ICommandHandler<ResistanceRollCommand, ActorResistanceRoll> {
  private readonly logger = new Logger(ResistanceRollHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(PSYCHOLOGY_TABLES_PORT) private readonly psychologyTables: PsychologyTablesPort,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: ResistanceRollCommand): Promise<ActorResistanceRoll> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) throw new NotFoundError('Actor round', command.actorRoundId);
    const bonus = command.bonus ?? actorRound.resistanceBonus(command.kind);
    if (bonus === undefined) {
      throw new ValidationError(`${actorRound.actorName} has no ${command.kind} RR bonus: send one`, 'err-resistance-bonus-required');
    }
    const frenzyDying = command.reason === 'frenzy-dying';
    if (frenzyDying && command.kind !== 'physical') {
      throw new ValidationError('The RR of a frenzy-dying actor is physical', 'err-resistance-roll-invalid');
    }
    // Workspace spec 087: the alert the RR answers, closed with its result for the round log
    const alert = command.alertId ? actorRound.alerts.find(each => each.id === command.alertId) : undefined;
    if (command.alertId && (!alert || alert.status !== 'pending' || !RR_ALERTS.includes(alert.type))) {
      throw new ValidationError(`The alert ${command.alertId} is not a pending RR alert`, 'err-alert-not-resolvable');
    }
    // Workspace spec 040, decision 14: attack level 0 and no penalties (the actor is unconscious).
    const attackLevel = frenzyDying ? 0 : command.attackLevel;
    const tables = await this.psychologyTables.find();
    const result = ResistanceRollCalculator.resolve(
      {
        kind: command.kind,
        roll: command.roll,
        bonus,
        attackLevel,
        // Workspace spec 068, decision 19: the lasting fear RR modifiers of the actor
        modifiers: [
          ...(command.modifiers ?? []),
          ...(command.kind === 'fear' ? temporaryModifierLines(actorRound.temporaryModifiers, 'fear-rr') : []),
        ],
        penalty: frenzyDying ? undefined : actorRound.getPenaltySum(),
      },
      tables,
    );
    const phase = alert ? Game.effectPhaseIn(await this.gameRepository.findById(actorRound.gameId), actorRound.round) : undefined;
    if (frenzyDying) {
      actorRound.resolveFrenzyDyingRr(result.resisted, { roll: command.roll, total: result.total }, phase);
      const updated = await this.actorRoundRepository.update(actorRound);
      return { actorRound: updated, bonus, attackLevel, result };
    }
    if (alert) {
      actorRound.closeAlert(alert, phase, {
        outcome: result.resisted ? 'resisted' : (result.result ?? 'failed'),
        roll: command.roll,
        total: result.total,
        values: { attackLevel, fearState: result.fearState ?? null },
      });
      const updated = await this.actorRoundRepository.update(actorRound);
      return { actorRound: updated, bonus, attackLevel, result };
    }
    return { actorRound, bonus, attackLevel, result };
  }
}
