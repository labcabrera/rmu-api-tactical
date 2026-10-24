import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, AuthenticatedUser } from './authenticated-request';

/** The user JwtAuthGuard authenticated: `@CurrentUser() user: AuthenticatedUser`. */
export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthenticatedUser => context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
