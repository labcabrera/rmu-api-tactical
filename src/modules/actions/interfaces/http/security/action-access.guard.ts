import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GAME_GUARD, type GameGuardPort } from '../../../../games/application/ports/game-guard.port.js';
import { GAME_REPOSITORY, type GameRepository } from '../../../../games/application/ports/game-repository.port.js';
import type { AuthenticatedRequest } from '../../../../shared/interfaces/http/authenticated-request.js';
import { ACTION_REPOSITORY, type ActionRepository } from '../../../application/ports/action-repository.port.js';

/**
 * `read`: as the game is read. `act`: a manager of the game or the owner of the actor of the action. `declare`: the
 * same for the `gameId` and `actorId` of the body. `participate`: a manager or the owner of any actor of the game, as
 * the defenders that parry an attack (spec 021, decision 2).
 */
export type ActionAccessMode = 'read' | 'act' | 'declare' | 'participate';

export const ActionAccess = Reflector.createDecorator<ActionAccessMode>();

/** Checks GameGuardPort on the game of the action of the `:id` param, or of the body (see GameAccessGuard). */
@Injectable()
export class ActionAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(GAME_GUARD) private readonly gameGuard: GameGuardPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const mode = this.reflector.get(ActionAccess, context.getHandler());
    if (!mode) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { id: userId, roles } = request.user;
    const target = mode === 'declare' ? declared(request.body) : await this.actionRepository.findById(request.params.id as string);
    // An unknown action is the 404 of the handler, and a body without its ids the 400 of the validation.
    if (!target) return true;
    const game = await this.gameRepository.findById(target.gameId);
    if (!game) return true;
    if (mode === 'read') this.gameGuard.checkRead(game, userId, roles);
    else if (mode === 'participate') this.gameGuard.checkParticipate(game, userId, roles);
    else this.gameGuard.checkAct(game, target.actorId, userId, roles);
    return true;
  }
}

function declared(body: unknown): { gameId: string; actorId: string } | null {
  const { gameId, actorId } = (body ?? {}) as { gameId?: unknown; actorId?: unknown };
  return typeof gameId === 'string' && typeof actorId === 'string' ? { gameId, actorId } : null;
}
