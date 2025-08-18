import { AuthenticatedCommand } from './authenticated-command';

export class DeleteRaceCommand extends AuthenticatedCommand {
  constructor(
    public readonly id: string,
    public readonly reason: string | undefined,
    userId: string,
    roles: string[] | undefined,
  ) {
    super(userId, roles);
  }
}
