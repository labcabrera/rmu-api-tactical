import { Actor } from '../value-objects/actor.vo.js';
import type { EnvironmentFaction } from '../value-objects/environment-faction.vo.js';
import { GameEnvironment } from '../value-objects/game-environment.vo.js';
import type { GamePhase } from '../value-objects/game-phase.vo.js';
import type { StrategicMember } from '../value-objects/strategic-member.vo.js';
import type { GameStatus } from '../value-objects/game-status.vo.js';
import type { GameSide, PsychologyRules } from '../value-objects/game-side.vo.js';
import type { TacticalGameOutcome } from '../value-objects/tactical-game-outcome.vo.js';

export type GameProps = {
  id: string;
  strategicGameId: string;
  name: string;
  status: GameStatus;
  round: number;
  phase: GamePhase;
  factions: string[];
  actors: Actor[];
  environment?: GameEnvironment;
  /** The environment faction of the game (spec 055); missing or null in games without one. */
  environmentFaction?: EnvironmentFaction | null;
  /** Workspace spec 068, decision 16: thresholds of fallen allies already alerted, by faction. */
  fearThresholdsAlerted?: Record<string, string[]> | null;
  description?: string;
  imageUrl?: string;
  owner: string;
  /**
   * Owner of the strategic game, copied when the game is created (spec 021): that user also manages the game. Missing in
   * the games created before spec 021 until the migration fills it.
   */
  strategicGameOwner?: string;
  /** `accessType` of the strategic game (spec 021): who reads the game. Missing means `private`. */
  accessType?: string;
  /**
   * Workspace spec 072, decision 13: the members of the strategic game, from its events. Missing in games not migrated
   * yet, which keep the rules of spec 021.
   */
  strategicMembers?: StrategicMember[] | null;
  /** Workspace spec 072, decision 13: the players of each strategic faction (`{factionId: [userId]}`). */
  factionPlayers?: Record<string, string[]> | null;
  /** Workspace spec 100: the sides defined by the game master; missing or empty means one side per faction. */
  sides?: GameSide[] | null;
  /** Workspace spec 100: missing in older games, which keep the rules of the book. */
  psychologyRules?: PsychologyRules | null;
  /** Workspace spec 100, decision 22: fallen levels of each side at the end of the last upkeep. */
  sideFallenLevels?: Record<string, number> | null;
  /** Set when the game is finished (spec 013, §3). */
  outcome?: TacticalGameOutcome;
  createdAt: Date;
  updatedAt?: Date;
};
