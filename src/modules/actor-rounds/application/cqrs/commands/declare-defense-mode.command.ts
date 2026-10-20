import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';
import type { DefenseLevel } from '../../../domain/value-objets/actor-round-defense-mode.vo';

/** Command to declare how an actor dodges and blocks this round. */
export class DeclareDefenseModeCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly dodge: DefenseLevel | undefined,
    public readonly block: DefenseLevel | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
