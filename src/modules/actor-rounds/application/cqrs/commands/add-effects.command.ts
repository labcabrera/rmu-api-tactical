import { ActorRoundEffect } from '../../../domain/value-objets/actor-round-effect.vo';

/**
 * Command to apply changes to HP and add status effects to an actor round.
 */
export class AddEffectsCommand {
  constructor(
    public readonly actorRoundId: string,
    public dmg: number,
    public readonly effects: ActorRoundEffect[],
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
