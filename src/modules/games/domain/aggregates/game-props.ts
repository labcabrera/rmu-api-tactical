import { Actor } from '../value-objects/actor.vo.js';
import type { EnvironmentFaction } from '../value-objects/environment-faction.vo.js';
import { GameEnvironment } from '../value-objects/game-environment.vo.js';
import type { GamePhase } from '../value-objects/game-phase.vo.js';
import type { GameStatus } from '../value-objects/game-status.vo.js';
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
  /** Set when the game is finished (spec 013, §3). */
  outcome?: TacticalGameOutcome;
  createdAt: Date;
  updatedAt?: Date;
};
