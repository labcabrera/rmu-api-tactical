import { Injectable } from '@nestjs/common';
import type { QueryFilter } from 'mongoose';
import { ForbiddenError } from '../../../shared/domain/errors/errors.js';
import { BaseEntityGuard, isAdmin } from '../../../shared/infrastructure/security/base-entity-guard.js';
import type { GameGuardPort } from '../../application/ports/game-guard.port.js';
import type { Game } from '../../domain/aggregates/game.js';

/** The rules of GameGuardPort over BaseEntityGuard: the strategic owner and the actor owners widen them (spec 021). */
@Injectable()
export class GameGuardAdapter extends BaseEntityGuard<Game> implements GameGuardPort {
  checkRead(game: Game, userId: string, roles: string[]): void {
    if (game.accessType === 'public') return;
    if (this.manages(game, userId, roles)) return;
    if (game.actors.some(actor => actor.owner === userId)) return;
    throw new ForbiddenError(`You do not have permission to read the game ${game.id}`);
  }

  checkUpdate(game: Game, userId: string, roles: string[]): void {
    if (this.manages(game, userId, roles)) return;
    throw new ForbiddenError(`You do not have permission to change the game ${game.id}`);
  }

  checkDelete(game: Game, userId: string, roles: string[]): void {
    if (this.manages(game, userId, roles)) return;
    throw new ForbiddenError(`You do not have permission to delete the game ${game.id}`);
  }

  checkAct(game: Game, actorId: string, userId: string, roles: string[]): void {
    if (this.manages(game, userId, roles)) return;
    if (game.actors.some(actor => actor.id === actorId && actor.owner === userId)) return;
    throw new ForbiddenError(`You do not have permission to act for the actor ${actorId} of the game ${game.id}`);
  }

  checkParticipate(game: Game, userId: string, roles: string[]): void {
    if (this.manages(game, userId, roles)) return;
    if (game.actors.some(actor => actor.owner === userId)) return;
    throw new ForbiddenError(`You do not take part in the game ${game.id}`);
  }

  buildQueryPredicate(userId: string, roles: string[]): QueryFilter<any> {
    if (isAdmin(roles)) return {};
    return {
      $or: [{ accessType: 'public' }, { owner: userId }, { strategicGameOwner: userId }, { 'actors.owner': userId }],
    };
  }

  private manages(game: Game, userId: string, roles: string[]): boolean {
    return isAdmin(roles) || game.owner === userId || (!!game.strategicGameOwner && game.strategicGameOwner === userId);
  }
}
