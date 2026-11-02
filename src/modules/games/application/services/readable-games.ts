import { isAdmin } from '../../../shared/infrastructure/security/base-entity-guard.js';
import type { GameGuardPort } from '../ports/game-guard.port.js';
import type { GameRepository } from '../ports/game-repository.port.js';

/**
 * The filter of a listing of actor rounds or actions: only those of the games the user can read (spec 021). An admin
 * reads everything, so there is no filter.
 */
export async function readableGamesFilter(
  gameRepository: GameRepository,
  gameGuard: GameGuardPort,
  userId: string,
  roles: string[],
): Promise<Record<string, unknown> | undefined> {
  if (isAdmin(roles)) return undefined;
  const gameIds = await gameRepository.findIds(gameGuard.buildQueryPredicate(userId, roles));
  return { gameId: { $in: gameIds } };
}
