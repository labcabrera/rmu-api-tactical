/** Keycloak groups that the API reads from the `groups` claim of the token (spec 021, decision 2). */
export type UserRole = 'rmu-admin' | 'rmu-user';

export const RMU_ADMIN: UserRole = 'rmu-admin';
/** Default group of every Keycloak user (spec 021, decision 4): it lets a user create. */
export const RMU_USER: UserRole = 'rmu-user';
