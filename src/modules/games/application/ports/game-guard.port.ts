import type { EntityGuard } from '../../../shared/application/ports/entity-guard.port.js';
import type { Game } from '../../domain/aggregates/game.js';

/**
 * Who may do what with a tactical game and what hangs from it (spec 021, decision 2):
 * - the game is managed (changed, played, deleted) by its owner, the owner of its strategic game or an admin;
 * - it is read as its strategic game says (`accessType`), and also by its managers and the owners of its actors;
 * - the owner of an actor acts for it: declares and resolves its actions and changes its actor round.
 */
export interface GameGuardPort extends EntityGuard<Game> {
  /** The user manages the game, or owns the actor `actorId` of the game. */
  checkAct(game: Game, actorId: string, userId: string, roles: string[]): void;

  /** The user manages the game, or owns one of its actors (a defender declaring a parry against an attack). */
  checkParticipate(game: Game, userId: string, roles: string[]): void;
}

export const GAME_GUARD = Symbol('GameGuard');
