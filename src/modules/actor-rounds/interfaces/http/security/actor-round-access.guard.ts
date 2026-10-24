import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GAME_GUARD, type GameGuardPort } from '../../../../games/application/ports/game-guard.port.js';
import { GAME_REPOSITORY, type GameRepository } from '../../../../games/application/ports/game-repository.port.js';
import type { AuthenticatedRequest } from '../../../../shared/interfaces/http/authenticated-request.js';
import { ACTOR_ROUND_REPOSITORY, type ActorRoundRepository } from '../../../application/ports/actor-round-repository.port.js';

/** `read`: as the game is read. `act`: a manager of the game or the owner of the actor (spec 021, decision 2). */
export type ActorRoundAccessMode = 'read' | 'act';

export const ActorRoundAccess = Reflector.createDecorator<ActorRoundAccessMode>();

/** Checks GameGuardPort on the game of the actor round of the `:id` param (see GameAccessGuard). */
@Injectable()
export class ActorRoundAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(GAME_GUARD) private readonly gameGuard: GameGuardPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const mode = this.reflector.get(ActorRoundAccess, context.getHandler());
    if (!mode) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { id: userId, roles } = request.user;
    const actorRound = await this.actorRoundRepository.findById(request.params.id as string);
    if (!actorRound) return true;
    const game = await this.gameRepository.findById(actorRound.gameId);
    if (!game) return true;
    if (mode === 'read') this.gameGuard.checkRead(game, userId, roles);
    else this.gameGuard.checkAct(game, actorRound.actorId, userId, roles);
    return true;
  }
}
