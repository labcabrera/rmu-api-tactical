import { FilterQuery } from 'mongoose';

export interface EntityGuard<E> {
  checkCreate(roles: string[]);

  checkRead(entity: E, userId: string, roles: string[]);

  checkUpdate(entity: E, userId: string, roles: string[]);

  checkDelete(entity: E, userId: string, roles: string[]);

  buildQueryPredicate(userId: string, roles: string[]): FilterQuery<any>;
}
