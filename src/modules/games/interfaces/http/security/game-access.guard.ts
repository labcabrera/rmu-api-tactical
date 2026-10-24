import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../../../shared/interfaces/http/authenticated-request.js';
import { GAME_GUARD, type GameGuardPort } from '../../../application/ports/game-guard.port.js';
import { GAME_REPOSITORY, type GameRepository } from '../../../application/ports/game-repository.port.js';

/** What an endpoint of `/v1/tactical-games/:id` needs (spec 021): read it, change it, delete it, or create one. */
export type GameAccessMode = 'read' | 'manage' | 'delete' | 'create';

/** `@GameAccess('manage')` on an endpoint of a controller guarded by GameAccessGuard. */
export const GameAccess = Reflector.createDecorator<GameAccessMode>();

/**
 * Checks GameGuardPort on the game of the `:id` param before the handler runs (spec 021, decision 2). The check is at
 * the HTTP edge, not in the command handlers, because handlers also run commands of their own on other actors (an
 * attack damages the target) that the caller does not own. An unknown game passes: the handler answers 404.
 */
@Injectable()
export class GameAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(GAME_GUARD) private readonly gameGuard: GameGuardPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const mode = this.reflector.get(GameAccess, context.getHandler());
    if (!mode) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { id: userId, roles } = request.user;
    if (mode === 'create') {
      this.gameGuard.checkCreate(roles);
      return true;
    }
    const game = await this.gameRepository.findById(request.params.id as string);
    if (!game) return true;
    if (mode === 'read') this.gameGuard.checkRead(game, userId, roles);
    else if (mode === 'delete') this.gameGuard.checkDelete(game, userId, roles);
    else this.gameGuard.checkUpdate(game, userId, roles);
    return true;
  }
}
