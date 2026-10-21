import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';

/** `POST /v1/tactical-games/:id/apply`: the outcome of a finished game to the strategic model (spec 013, §3). */
export class ApplyGameCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
