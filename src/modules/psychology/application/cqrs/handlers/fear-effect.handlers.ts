import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import type { ActorRoundEffect } from '../../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import type { InjurySource } from '../../../../actor-rounds/domain/value-objects/injury.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import {
  FEAR_STATES,
  type FailureSeverity,
  type FearState,
  type PsychologyTables,
} from '../../../domain/value-objects/psychology-tables.vo.js';
import { type PsychologyTablesPort, PSYCHOLOGY_TABLES_PORT } from '../../ports/psychology-tables.port.js';
import { ApplyFearEffectCommand, GetFrightLevelsQuery } from '../commands/fear-effect.commands.js';

/** Failure severities of a resistance roll, mildest first, in the order of the fear states (Table 14-3a). */
const SEVERITIES: FailureSeverity[] = ['mild', 'moderate', 'severe', 'extreme'];

export interface FearEffectResult {
  actorRound: ActorRound;
  /** The fear state of the severity. */
  fearState: FearState;
  /** The fear effect the actor ends with: the worst of its previous one and the new one. */
  effect: ActorRoundEffect;
  /** The actor already had that state or a worse one. */
  unchanged: boolean;
}

/**
 * The fear state of a failure severity: the one core's Table 14-3a gives it, else the one in the same position of the
 * mildest-first order.
 */
export const fearStateOf = (severity: FailureSeverity, tables: Pick<PsychologyTables, 'fearResults'> | null): FearState =>
  tables?.fearResults?.find(row => row.severity === severity)?.result ?? FEAR_STATES[SEVERITIES.indexOf(severity)];

/**
 * The result of an individual fear RR on the actor (workspace spec 068, decision 15, S11 option a): `frighten()` keeps
 * the worst fear state. The MFE stops using `POST /effects` for it.
 */
@CommandHandler(ApplyFearEffectCommand)
export class ApplyFearEffectHandler implements ICommandHandler<ApplyFearEffectCommand, FearEffectResult> {
  private readonly logger = new Logger(ApplyFearEffectHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(PSYCHOLOGY_TABLES_PORT) private readonly psychologyTables: PsychologyTablesPort,
  ) {}

  async execute(command: ApplyFearEffectCommand): Promise<FearEffectResult> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) throw new NotFoundError('Actor round', command.actorRoundId);
    const game = await this.gameRepository.findById(actorRound.gameId);
    game?.checkNotFinished();
    const tables = await this.psychologyTables.find().catch(() => null);
    const fearState = fearStateOf(command.severity, tables);
    const source: InjurySource = {
      kind: 'manual',
      tacticalGameId: actorRound.gameId,
      ...(game ? { tacticalGameName: game.name } : {}),
      round: actorRound.round,
      ...(command.source?.actorId ? { attackerId: command.source.actorId } : {}),
      ...(command.source?.name ? { attackerName: command.source.name } : {}),
    };
    const previous = actorRound.fearEffect()?.id;
    const effect = actorRound.frighten(`fear-${fearState}`, 0, source);
    const unchanged = effect.id === previous;
    const updated = unchanged ? actorRound : await this.actorRoundRepository.update(actorRound);
    return { actorRound: updated, fearState, effect, unchanged };
  }
}

export interface FrightLevels {
  frightLevels: PsychologyTables['frightLevels'];
  frightLevelModifiers: PsychologyTables['frightLevelModifiers'];
  fallenThresholds: NonNullable<PsychologyTables['fallenThresholds']>;
}

/**
 * The fright levels and their modifiers of Table 14-3a and the thresholds of fallen allies, for any participant of the
 * game (workspace spec 068, S12 option b): tactical reads core with its service token, so no `rmu-core-law` role.
 */
@QueryHandler(GetFrightLevelsQuery)
export class GetFrightLevelsHandler implements IQueryHandler<GetFrightLevelsQuery, FrightLevels> {
  constructor(@Inject(PSYCHOLOGY_TABLES_PORT) private readonly psychologyTables: PsychologyTablesPort) {}

  async execute(): Promise<FrightLevels> {
    const tables = await this.psychologyTables.find();
    return {
      frightLevels: tables.frightLevels ?? [],
      frightLevelModifiers: tables.frightLevelModifiers ?? [],
      fallenThresholds: tables.fallenThresholds ?? [],
    };
  }
}
