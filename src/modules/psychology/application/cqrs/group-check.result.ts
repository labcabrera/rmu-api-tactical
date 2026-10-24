import type { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.js';
import type { FailureSeverity, UnusualEventRow } from '../../domain/value-objects/psychology-tables.vo.js';
import type { ResistanceModifier } from '../../domain/services/resistance-roll.calculator.js';
import type { Leader } from '../services/group-check.service.js';

export type GroupCheckKind = 'fear' | 'morale' | 'rally';

/** `skipped`: dead or unconscious. `resisted` / `afraid`: a fear RR. `follower`: morale and rally. */
export type ActorCheckStatus = 'skipped' | 'resisted' | 'afraid' | 'follower';

/** What a group check did to one actor, for the list of the UI. */
export interface ActorCheckResult {
  actorId: string;
  actorRoundId: string;
  actorName: string;
  factionId: string;
  status: ActorCheckStatus;
  /** Fear: its RR. */
  roll?: number;
  rolledByServer?: boolean;
  bonus?: number;
  breakdown?: ResistanceModifier[];
  total?: number;
  required?: number;
  failure?: number;
  severity?: FailureSeverity;
  /** Fear effect status before and after the check (`fear-balk`...); undefined when not afraid. */
  previousEffect?: string;
  effect?: string;
  /** What the actor round enforces: `no-attacks` for routed and broken actors. */
  restrictions: string[];
  /** Keys for the game master: `no-fear-rr-bonus`... */
  warnings: string[];
}

/** The leader's roll of a morale or rally check. */
export interface LeaderCheckRoll {
  roll: number;
  rolledByServer: boolean;
  breakdown: ResistanceModifier[];
  total: number;
  /** Result key of the table (absolute-failure...). */
  result?: string;
  /** Unmodified 66: the unusual event of the table, with its numbers for the game master. */
  unusualEvent?: UnusualEventRow;
}

export interface GroupCheckResult {
  kind: GroupCheckKind;
  gameId: string;
  round: number;
  leader?: Leader;
  /** Fear: the attack level of the RRs. */
  frightLevel?: number;
  leaderRoll?: LeaderCheckRoll;
  /** Morale: outcome key and the modifier to later morale rolls (a warning: it lasts days). */
  outcome?: string;
  moraleModifier?: number;
  moraleModifierDays?: number;
  /** Rally: severity steps the fear of each follower changed by. */
  fearSeverityChange?: number;
  actors: ActorCheckResult[];
  /** Actor rounds written by the check. */
  actorRounds: ActorRound[];
}

export const actorResult = (round: ActorRound, status: ActorCheckStatus): ActorCheckResult => ({
  actorId: round.actorId,
  actorRoundId: round.id,
  actorName: round.actorName,
  factionId: round.factionId,
  status,
  previousEffect: round.fearEffect()?.status,
  effect: round.fearEffect()?.status,
  restrictions: round.isFearBlockingAttacks() ? ['no-attacks'] : [],
  warnings: [],
});
