import { ActorRoundEffect } from '../../../domain/value-objets/actor-round-effect.vo';

export class AddEffectCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly effect: ActorRoundEffect,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
