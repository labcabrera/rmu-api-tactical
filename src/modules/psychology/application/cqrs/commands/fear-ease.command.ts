import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

/** Workspace spec 100, decision 22: the game master lifts the balk and retreat of the standing members of a side. */
export class FearEaseCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly sideId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
