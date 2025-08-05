import { container } from '@shared/container';
import { AuthService } from '@infrastructure/adapters/inbound/web/security/auth.service';

export function createAuthMiddleware() {
  const authService = container.get<AuthService>('AuthService');
  return authService.middleware();
}

export function requireRoles(roles: string[], requireAll: boolean = false) {
  return AuthService.requireRoles(roles, requireAll);
}
