/**
 * Deletes all games associated with a specific strategic identifier.
 */
export class DeleteGamesByStrategicIdCommand {
  constructor(
    public readonly strategicGameId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
