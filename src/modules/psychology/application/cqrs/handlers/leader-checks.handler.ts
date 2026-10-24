import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { DIFFICULTY_MAP } from '../../../../actions/domain/value-objects/difficulty.vo.js';
import type { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { FEAR_EFFECTS } from '../../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import type { ResistanceModifier } from '../../../domain/services/resistance-roll.calculator.js';
import { findBand, type PsychologyTables, type UnusualEventRow } from '../../../domain/value-objects/psychology-tables.vo.js';
import { type PsychologyTablesPort, PSYCHOLOGY_TABLES_PORT } from '../../ports/psychology-tables.port.js';
import { GroupCheckService, type Leader } from '../../services/group-check.service.js';
import { type LeaderRollRequest, MoraleCheckCommand, RallyCheckCommand } from '../commands/group-check.commands.js';
import { actorResult, type GroupCheckResult, type LeaderCheckRoll } from '../group-check.result.js';

/** Unmodified roll of an unusual event (§5.1). */
const UNUSUAL_EVENT_ROLL = 66;

interface LeaderContext {
  game: { id: string; round: number };
  leader: Leader;
  followers: ActorRound[];
  skipped: ActorRound[];
  tables: PsychologyTables;
}

/** The game, the leader (required), its followers (the group but the leader) and the tables. */
const loadLeaderContext = async (
  service: GroupCheckService,
  tablesPort: PsychologyTablesPort,
  gameId: string,
  request: LeaderRollRequest,
): Promise<LeaderContext> => {
  if (!request.leader?.actorId) {
    throw new ValidationError('A morale or rally check needs a leader', 'err-leader-required');
  }
  const { game, rounds } = await service.load(gameId);
  const members = GroupCheckService.group(rounds, request.group, request.leader.actorId);
  const leader = await service.leader(rounds, request.leader);
  const others = members.filter(member => member.actorId !== leader.actorRound.actorId);
  return {
    game,
    leader,
    followers: others.filter(member => !GroupCheckService.isOut(member)),
    skipped: others.filter(member => GroupCheckService.isOut(member)),
    tables: await tablesPort.find(),
  };
};

/** The leader's roll: the client's (or one made here), its Leadership bonus and the terms of the check. */
const leaderRoll = (request: LeaderRollRequest, leader: Leader, terms: ResistanceModifier[]) => {
  const roll = GroupCheckService.roll(request.roll);
  const breakdown: ResistanceModifier[] = [
    { key: 'roll', value: roll.roll },
    { key: 'leadership', value: leader.leadershipBonus },
    ...terms.filter(term => term.value),
    ...(request.modifiers ?? []).filter(modifier => modifier.value),
  ];
  const unmodified = request.unmodifiedRoll ?? roll.unmodified ?? roll.roll;
  return {
    roll: roll.roll,
    rolledByServer: roll.rolledByServer,
    breakdown,
    total: breakdown.reduce((sum, term) => sum + term.value, 0),
    unusual: unmodified === UNUSUAL_EVENT_ROLL,
  };
};

const unusualEvent = (unusual: boolean, row: UnusualEventRow | null | undefined): UnusualEventRow | undefined =>
  unusual && row ? { ...row } : undefined;

/**
 * A morale check (workspace spec 022, decision 10, §14.3): one Absolute roll of the leader with its Leadership bonus,
 * the average fear RR bonus of the followers and the difficulty of the command, read on the morale table (14-3b) of
 * core. It changes no actor round: the outcome and the temporary modifier are for the game master.
 */
@CommandHandler(MoraleCheckCommand)
export class MoraleCheckHandler implements ICommandHandler<MoraleCheckCommand, GroupCheckResult> {
  private readonly logger = new Logger(MoraleCheckHandler.name);

  constructor(
    private readonly groupCheckService: GroupCheckService,
    @Inject(PSYCHOLOGY_TABLES_PORT) private readonly psychologyTables: PsychologyTablesPort,
  ) {}

  async execute(command: MoraleCheckCommand): Promise<GroupCheckResult> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const request = command.request;
    const context = await loadLeaderContext(this.groupCheckService, this.psychologyTables, command.gameId, request);
    if (context.followers.length === 0) {
      throw new ValidationError('The leader has no followers able to obey', 'err-morale-no-followers');
    }
    const actors = context.followers.map(follower => {
      const result = actorResult(follower, 'follower');
      const bonus = request.bonuses?.[follower.actorId] ?? follower.resistanceBonus('fear');
      if (bonus === undefined) {
        result.warnings.push('no-fear-rr-bonus');
      } else {
        result.bonus = bonus;
      }
      return result;
    });
    const bonuses = actors.filter(actor => actor.bonus !== undefined).map(actor => actor.bonus!);
    const average = bonuses.length > 0 ? Math.round(bonuses.reduce((sum, bonus) => sum + bonus, 0) / bonuses.length) : 0;
    const difficulty = DIFFICULTY_MAP.get(request.difficulty ?? 'm');
    if (difficulty === undefined) {
      throw new ValidationError(`Unknown difficulty '${request.difficulty}'`, 'err-morale-invalid-difficulty');
    }
    const rolled = leaderRoll(request, context.leader, [
      { key: 'followers-fear-rr', value: average },
      { key: 'difficulty', value: difficulty },
    ]);
    const row = findBand(context.tables.morale, rolled.total);
    const event = unusualEvent(rolled.unusual, context.tables.moraleUnusualEvent);
    const leaderCheck: LeaderCheckRoll = { ...MoraleCheckHandler.roll(rolled), result: row?.result, unusualEvent: event };
    const skipped = context.skipped.map(each => actorResult(each, 'skipped'));
    return {
      kind: 'morale',
      gameId: context.game.id,
      round: context.game.round,
      leader: context.leader,
      leaderRoll: leaderCheck,
      outcome: event?.outcome ?? row?.outcome,
      moraleModifier: row?.moraleModifier ?? undefined,
      moraleModifierDays: row?.moraleModifierDays ?? undefined,
      actors: [...actors, ...skipped],
      actorRounds: [],
    };
  }

  static roll(rolled: ReturnType<typeof leaderRoll>): LeaderCheckRoll {
    return { roll: rolled.roll, rolledByServer: rolled.rolledByServer, breakdown: rolled.breakdown, total: rolled.total };
  }
}

/**
 * A rally (workspace spec 022, decision 10, §14.3): the leader's roll with its Leadership bonus, the rally modifier of
 * the worst fear state among the frightened followers and the modifier for their number, read on the rally table
 * (14-3c) of core; the fear of each frightened follower changes by the severities of the result (it ends below the
 * mildest).
 */
@CommandHandler(RallyCheckCommand)
export class RallyCheckHandler implements ICommandHandler<RallyCheckCommand, GroupCheckResult> {
  private readonly logger = new Logger(RallyCheckHandler.name);

  constructor(
    private readonly groupCheckService: GroupCheckService,
    @Inject(PSYCHOLOGY_TABLES_PORT) private readonly psychologyTables: PsychologyTablesPort,
  ) {}

  async execute(command: RallyCheckCommand): Promise<GroupCheckResult> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const request = command.request;
    const context = await loadLeaderContext(this.groupCheckService, this.psychologyTables, command.gameId, request);
    const afraid = context.followers.filter(follower => !!follower.fearEffect());
    if (afraid.length === 0) {
      throw new ValidationError('No follower of the group is afraid', 'err-rally-nobody-afraid');
    }
    const worst = afraid
      .map(follower => follower.fearEffect()!.status)
      .reduce((a, b) => (FEAR_EFFECTS.indexOf(a) >= FEAR_EFFECTS.indexOf(b) ? a : b));
    const worstModifier = context.tables.fearResults.find(row => `fear-${row.result}` === worst)?.rallyModifier ?? 0;
    const group = context.tables.rallyGroupModifier;
    const groupModifier = group && group.followersPerStep > 0 ? group.modifier * Math.ceil(afraid.length / group.followersPerStep) : 0;
    const rolled = leaderRoll(request, context.leader, [
      { key: 'worst-fear', value: worstModifier },
      { key: 'followers', value: groupModifier },
    ]);
    const row = findBand(context.tables.rally, rolled.total);
    const steps = row?.fearSeverityChange ?? 0;
    const actors = afraid.map(follower => {
      const result = actorResult(follower, 'follower');
      result.effect = follower.changeFear(steps)?.status;
      result.restrictions = follower.isFearBlockingAttacks() ? ['no-attacks'] : [];
      return result;
    });
    const calm = context.followers.filter(follower => !follower.fearEffect() && !afraid.includes(follower));
    const actorRounds = steps ? await this.groupCheckService.save(afraid) : [];
    return {
      kind: 'rally',
      gameId: context.game.id,
      round: context.game.round,
      leader: context.leader,
      leaderRoll: {
        ...MoraleCheckHandler.roll(rolled),
        result: row?.result,
        unusualEvent: unusualEvent(rolled.unusual, context.tables.rallyUnusualEvent),
      },
      fearSeverityChange: steps,
      actors: [...actors, ...calm.map(each => actorResult(each, 'follower')), ...context.skipped.map(each => actorResult(each, 'skipped'))],
      actorRounds,
    };
  }
}
