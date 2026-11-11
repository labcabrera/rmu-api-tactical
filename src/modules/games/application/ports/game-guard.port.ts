import type { EntityGuard } from '../../../shared/application/ports/entity-guard.port.js';
import type { Game } from '../../domain/aggregates/game.js';
import type { TacticalGameAccess } from '../../domain/value-objects/strategic-member.vo.js';

/**
 * Who may do what with a tactical game and what hangs from it (spec 021, decision 2):
 * - the game is managed (changed, played, deleted) by its owner, the owner of its strategic game or an admin;
 * - it is read as its strategic game says (`accessType`), and also by its managers and the owners of its actors;
 * - the owner of an actor acts for it: declares and resolves its actions and changes its actor round.
 *
 * Workspace spec 072 widens them with the members of the strategic game (decisions 11 and 12): every member reads the
 * game, the masters manage it, and the players of a faction act for all the actors of the faction.
 */
export interface GameGuardPort extends EntityGuard<Game> {
  /** The user manages the game, owns the actor `actorId` of the game or plays its faction. */
  checkAct(game: Game, actorId: string, userId: string, roles: string[]): void;

  /**
   * The user manages the game, owns one of its actors or plays one of its factions (a defender declaring a parry against
   * an attack).
   */
  checkParticipate(game: Game, userId: string, roles: string[]): void;

  /** What the user does with a game the user reads: `manage`, `act` (takes part) or `read` (spec 072, contract 23). */
  accessOf(game: Game, userId: string, roles: string[]): TacticalGameAccess;
}

export const GAME_GUARD = Symbol('GameGuard');
