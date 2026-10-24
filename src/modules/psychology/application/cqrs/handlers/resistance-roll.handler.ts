import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { ResistanceRollCalculator, type ResistanceRollResult } from '../../../domain/services/resistance-roll.calculator.js';
import { type PsychologyTablesPort, PSYCHOLOGY_TABLES_PORT } from '../../ports/psychology-tables.port.js';
import { ResistanceRollCommand } from '../commands/resistance-roll.command.js';

export interface ActorResistanceRoll {
  actorRound: ActorRound;
  bonus: number;
  attackLevel: number;
  result: ResistanceRollResult;
}

/**
 * A resistance roll of an actor (workspace spec 022, decision 8): its bonus of the kind from its sheet (or the game
 * master's), the roll and the modifiers against the attack level, resolved with core's psychology tables. It changes
 * nothing: the fear checks of a group put the effects.
 */
@CommandHandler(ResistanceRollCommand)
export class ResistanceRollHandler implements ICommandHandler<ResistanceRollCommand, ActorResistanceRoll> {
  private readonly logger = new Logger(ResistanceRollHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(PSYCHOLOGY_TABLES_PORT) private readonly psychologyTables: PsychologyTablesPort,
  ) {}

  async execute(command: ResistanceRollCommand): Promise<ActorResistanceRoll> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) throw new NotFoundError('Actor round', command.actorRoundId);
    const bonus = command.bonus ?? actorRound.resistanceBonus(command.kind);
    if (bonus === undefined) {
      throw new ValidationError(`${actorRound.actorName} has no ${command.kind} RR bonus: send one`, 'err-resistance-bonus-required');
    }
    const tables = await this.psychologyTables.find();
    const result = ResistanceRollCalculator.resolve(
      {
        kind: command.kind,
        roll: command.roll,
        bonus,
        attackLevel: command.attackLevel,
        modifiers: command.modifiers,
        penalty: actorRound.getPenaltySum(),
      },
      tables,
    );
    return { actorRound, bonus, attackLevel: command.attackLevel, result };
  }
}
