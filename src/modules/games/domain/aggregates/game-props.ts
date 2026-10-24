import { Actor } from '../value-objects/actor.vo';
import { GameEnvironment } from '../value-objects/game-environment.vo';
import { GamePhase } from '../value-objects/game-phase.vo';
import { GameStatus } from '../value-objects/game-status.vo';
import { TacticalGameOutcome } from '../value-objects/tactical-game-outcome.vo';

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
  description?: string;
  imageUrl?: string;
  owner: string;
  /** Set when the game is finished (spec 013, §3). */
  outcome?: TacticalGameOutcome;
  createdAt: Date;
  updatedAt?: Date;
};
