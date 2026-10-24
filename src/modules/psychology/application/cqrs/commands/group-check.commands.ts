import type { Difficulty } from '../../../../actions/domain/value-objects/difficulty.vo.js';
import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { ResistanceModifier } from '../../../domain/services/resistance-roll.calculator.js';
import type { GroupSelection, LeaderRequest } from '../../services/group-check.service.js';

/** What every group check of a tactical game takes (workspace spec 022, decisions 6 and 7). */
export interface GroupCheckRequest {
  group?: GroupSelection;
  leader?: LeaderRequest;
  modifiers?: ResistanceModifier[];
}

export interface FearCheckRequest extends GroupCheckRequest {
  /** Attack level of the fear RRs: a level of Table 14-3a, or the Intimidation ranks of `intimidatorActorId`. */
  frightLevel?: number;
  intimidatorActorId?: string;
  /** Intimidation ranks of an intimidating NPC. */
  intimidationRanks?: number;
  /** Open-ended roll of each actor by actor id; rolled by the server when missing. */
  rolls?: Record<string, number>;
  /** Fear RR bonus of each actor without one in its sheet (NPCs), by actor id. */
  bonuses?: Record<string, number>;
}

export interface LeaderRollRequest extends GroupCheckRequest {
  /** Open-ended roll of the leader; rolled by the server when missing. */
  roll?: number;
  /** First roll of the open-ended one, when it is not `roll` (66: unusual event). */
  unmodifiedRoll?: number;
}

export interface MoraleCheckRequest extends LeaderRollRequest {
  /** How reasonable the command looks to the followers (Table 5-1); medium by default. */
  difficulty?: Difficulty;
  /** Fear RR bonus of each follower without one in its sheet (NPCs), by actor id. */
  bonuses?: Record<string, number>;
}

/** `POST /v1/tactical-games/:id/fear-checks`. */
export class FearCheckCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly request: FearCheckRequest,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** `POST /v1/tactical-games/:id/morale-checks`. */
export class MoraleCheckCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly request: MoraleCheckRequest,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** `POST /v1/tactical-games/:id/rally-checks`. */
export class RallyCheckCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly request: LeaderRollRequest,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
