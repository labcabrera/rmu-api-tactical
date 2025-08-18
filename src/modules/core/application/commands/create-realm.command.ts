import { AuthenticatedCommand } from './authenticated-command';

export class CreateRealmCommand extends AuthenticatedCommand {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
