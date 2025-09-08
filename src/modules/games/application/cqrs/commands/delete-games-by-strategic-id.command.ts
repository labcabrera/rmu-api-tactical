/**
 * Deletes all games associated with a specific strategic identifier.
 */
export class DeleteGamesByStrategicIdCommand {
  constructor(
    public readonly strategicId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
