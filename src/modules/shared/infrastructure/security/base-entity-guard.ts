import type { QueryFilter } from 'mongoose';
import type { EntityGuard } from '../../application/ports/entity-guard.port.js';
import type { RbacEntity } from '../../domain/entities/rbac-entity.js';
import { RMU_ADMIN, RMU_USER } from '../../domain/entities/user-roles.js';
import { ForbiddenError } from '../../domain/errors/errors.js';

/**
 * The permission model of every RMU API (spec 021, decision 2), as in rmu-api-core: read by `accessType` (public, or
 * the owner, or an admin); create with `rmu-user` or `rmu-admin`; change and delete the owner or `rmu-admin`. The
 * guard of an aggregate extends it when the rule depends on something else (the tactical game: its strategic game and
 * its actors). Tactical has no QueryCriteria: the listing predicate is a Mongo filter.
 */
export abstract class BaseEntityGuard<E extends RbacEntity> implements EntityGuard<E> {
  checkRead(entity: E, userId: string, roles: string[]): void {
    if (entity.accessType === 'public') return;
    if (isAdmin(roles)) return;
    if (entity.owner === userId) return;
    throw new ForbiddenError('You do not have permission to read this entity');
  }

  checkCreate(roles: string[]): void {
    if (isAdmin(roles)) return;
    if (roles.includes(RMU_USER)) return;
    throw new ForbiddenError('You do not have permission to create this entity');
  }

  checkUpdate(entity: E, userId: string, roles: string[]): void {
    if (isAdmin(roles)) return;
    if (entity.owner === userId) return;
    throw new ForbiddenError('You do not have permission to update this entity');
  }

  checkDelete(entity: E, userId: string, roles: string[]): void {
    if (isAdmin(roles)) return;
    if (entity.owner === userId) return;
    throw new ForbiddenError('You do not have permission to delete this entity');
  }

  /** What a listing may return to the user: everything for an admin. */
  buildQueryPredicate(userId: string, roles: string[]): QueryFilter<any> {
    if (isAdmin(roles)) return {};
    return { $or: [{ accessType: 'public' }, { owner: userId }] };
  }
}

export const isAdmin = (roles: string[]): boolean => roles.includes(RMU_ADMIN);
