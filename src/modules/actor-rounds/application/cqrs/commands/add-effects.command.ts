import { AttackLocation } from '../../../../actions/domain/value-objects/attack-location.vo';
import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';
import { ActorRoundEffect } from '../../../domain/value-objets/actor-round-effect.vo';

/**
 * Command to apply changes to HP and add status effects to an actor round.
 */
export class AddEffectsCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public dmg: number,
    public readonly effects: ActorRoundEffect[],
    public readonly location: AttackLocation | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
