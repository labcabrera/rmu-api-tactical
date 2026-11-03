import { Injectable } from '@nestjs/common';
import type { QueryFilter } from 'mongoose';
import { ForbiddenError } from '../../../shared/domain/errors/errors.js';
import { BaseEntityGuard, isAdmin } from '../../../shared/infrastructure/security/base-entity-guard.js';
import type { GameGuardPort } from '../../application/ports/game-guard.port.js';
import type { Game } from '../../domain/aggregates/game.js';
import type { TacticalGameAccess } from '../../domain/value-objects/strategic-member.vo.js';

/**
 * The rules of GameGuardPort over BaseEntityGuard: the strategic owner and the actor owners widen them (spec 021), and
 * so do the members of the strategic game and the players of its factions (workspace spec 072, decisions 11 and 12).
 * A game without `strategicMembers` or `factionPlayers` (not migrated yet) keeps the rules of spec 021.
 */
@Injectable()
export class GameGuardAdapter extends BaseEntityGuard<Game> implements GameGuardPort {
  checkRead(game: Game, userId: string, roles: string[]): void {
    if (this.reads(game, userId, roles)) return;
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
    const actor = game.actors.find(each => each.id === actorId);
    if (actor && (actor.owner === userId || game.isFactionPlayer(actor.faction.id, userId))) return;
    throw new ForbiddenError(`You do not have permission to act for the actor ${actorId} of the game ${game.id}`);
  }

  checkParticipate(game: Game, userId: string, roles: string[]): void {
    if (this.manages(game, userId, roles) || this.participates(game, userId)) return;
    throw new ForbiddenError(`You do not take part in the game ${game.id}`);
  }

  accessOf(game: Game, userId: string, roles: string[]): TacticalGameAccess {
    if (this.manages(game, userId, roles)) return 'manage';
    if (this.participates(game, userId)) return 'act';
    return 'read';
  }

  buildQueryPredicate(userId: string, roles: string[]): QueryFilter<any> {
    if (isAdmin(roles)) return {};
    return {
      $or: [
        { accessType: 'public' },
        { owner: userId },
        { strategicGameOwner: userId },
        { 'actors.owner': userId },
        { 'strategicMembers.userId': userId },
      ],
    };
  }

  private reads(game: Game, userId: string, roles: string[]): boolean {
    if (game.accessType === 'public' || this.manages(game, userId, roles)) return true;
    if (game.actors.some(actor => actor.owner === userId)) return true;
    // Decision 11: every member of the strategic game reads its tactical games, spectators too.
    return game.strategicRoleOf(userId) !== undefined;
  }

  private manages(game: Game, userId: string, roles: string[]): boolean {
    if (isAdmin(roles) || game.owner === userId) return true;
    if (!!game.strategicGameOwner && game.strategicGameOwner === userId) return true;
    // Decision 11: the masters of the strategic game manage its tactical games, as its owner does.
    return !!userId && game.strategicRoleOf(userId) === 'master';
  }

  /** Owns an actor, or plays a faction of the game (decision 12). */
  private participates(game: Game, userId: string): boolean {
    if (!userId) return false;
    if (game.actors.some(actor => actor.owner === userId)) return true;
    return game.factions.some(factionId => game.isFactionPlayer(factionId, userId));
  }
}
