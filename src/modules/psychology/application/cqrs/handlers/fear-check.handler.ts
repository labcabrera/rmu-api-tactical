import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import type { InjurySource } from '../../../../actor-rounds/domain/value-objects/injury.vo.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { ResistanceRollCalculator } from '../../../domain/services/resistance-roll.calculator.js';
import { type PsychologyTablesPort, PSYCHOLOGY_TABLES_PORT } from '../../ports/psychology-tables.port.js';
import { GroupCheckService, type Leader } from '../../services/group-check.service.js';
import { FearCheckCommand } from '../commands/group-check.commands.js';
import { actorResult, type GroupCheckResult } from '../group-check.result.js';

/**
 * A fear check of a group (workspace spec 022, decision 9, §14.3): each actor of the group rolls its fear RR against
 * the fright level (or the Intimidation ranks of an actor), with the leader's bonus when it follows a recognized
 * leader; a failure puts the fear effect of its margin on its actor round, unless it has a worse one.
 */
@CommandHandler(FearCheckCommand)
export class FearCheckHandler implements ICommandHandler<FearCheckCommand, GroupCheckResult> {
  private readonly logger = new Logger(FearCheckHandler.name);

  constructor(
    private readonly groupCheckService: GroupCheckService,
    @Inject(PSYCHOLOGY_TABLES_PORT) private readonly psychologyTables: PsychologyTablesPort,
  ) {}

  async execute(command: FearCheckCommand): Promise<GroupCheckResult> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const request = command.request;
    const { game, rounds } = await this.groupCheckService.load(command.gameId);
    const members = GroupCheckService.group(rounds, request.group, request.leader?.actorId);
    const leader = request.leader ? await this.groupCheckService.leader(rounds, request.leader) : undefined;
    const frightLevel = await this.frightLevel(command, rounds);
    const tables = await this.psychologyTables.find();
    const source: InjurySource = { kind: 'manual', tacticalGameId: game.id, tacticalGameName: game.name, round: game.round };
    const changed: ActorRound[] = [];
    const actors = members.map(member => {
      if (GroupCheckService.isOut(member)) {
        return actorResult(member, 'skipped');
      }
      const result = actorResult(member, 'resisted');
      let bonus = request.bonuses?.[member.actorId] ?? member.resistanceBonus('fear');
      if (bonus === undefined) {
        bonus = 0;
        result.warnings.push('no-fear-rr-bonus');
      }
      const modifiers = [...(request.modifiers ?? [])];
      const leaderBonus = FearCheckHandler.leaderBonus(leader, member);
      if (leaderBonus) {
        modifiers.push({ key: 'leader', value: leaderBonus });
      }
      const roll = GroupCheckService.roll(request.rolls?.[member.actorId]);
      const rr = ResistanceRollCalculator.resolve(
        { kind: 'fear', roll: roll.roll, bonus, attackLevel: frightLevel, modifiers, penalty: member.getPenaltySum() },
        tables,
      );
      Object.assign(result, {
        roll: roll.roll,
        rolledByServer: roll.rolledByServer,
        bonus,
        breakdown: rr.breakdown,
        total: rr.total,
        required: rr.required,
        failure: rr.failure,
        severity: rr.severity,
      });
      if (!rr.resisted && rr.fearState) {
        result.status = 'afraid';
        result.effect = member.frighten(`fear-${rr.fearState}`, rr.failure, source).status;
        result.restrictions = member.isFearBlockingAttacks() ? ['no-attacks'] : [];
        if (result.effect !== result.previousEffect) {
          changed.push(member);
        }
      }
      return result;
    });
    const actorRounds = await this.groupCheckService.save(changed);
    return { kind: 'fear', gameId: game.id, round: game.round, leader, frightLevel, actors, actorRounds };
  }

  /** The fright level sent, or the Intimidation ranks of the intimidating actor (§14.2). */
  private async frightLevel(command: FearCheckCommand, rounds: ActorRound[]): Promise<number> {
    const request = command.request;
    if (request.frightLevel !== undefined && request.frightLevel !== null) {
      return request.frightLevel;
    }
    if (request.intimidatorActorId) {
      return this.groupCheckService.intimidationRanks(rounds, request.intimidatorActorId, request.intimidationRanks);
    }
    throw new ValidationError('A fear check needs a fright level or an intimidating actor', 'err-fright-level-required');
  }

  /** A follower of a recognized leader adds its bonus; the leader does not. */
  private static leaderBonus(leader: Leader | undefined, member: ActorRound): number {
    if (!leader || leader.actorRound.actorId === member.actorId) {
      return 0;
    }
    return leader.fearRrBonus;
  }
}
