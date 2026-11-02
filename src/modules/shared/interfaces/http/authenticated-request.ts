import type { Request } from 'express';

/** The user that JwtStrategy.validate() puts on the request. */
export interface AuthenticatedUser {
  id: string;
  email?: string;
  name?: string;
  username?: string;
  given_name?: string;
  family_name?: string;
  roles: string[];
}

export type AuthenticatedRequest = Request & { user: AuthenticatedUser };
