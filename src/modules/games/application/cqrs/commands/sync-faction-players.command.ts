/** A strategic faction created or changed (workspace spec 072, decision 13): its players reach the tactical games. */
export class SyncFactionPlayersCommand {
  constructor(
    public readonly strategicGameId: string,
    public readonly factionId: string,
    public readonly players: string[],
  ) {}
}
