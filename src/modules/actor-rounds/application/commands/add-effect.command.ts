import { ActorRoundEffect } from '../../domain/entities/actor-round.entity';

export class AddEffectCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly effect: ActorRoundEffect,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
