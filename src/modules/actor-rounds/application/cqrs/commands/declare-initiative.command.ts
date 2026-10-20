export class DeclareInitiativeCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly initiativeRoll: number,
    public readonly userId: string,
    public readonly roles: string[],
    /** The game master declares a sudden movement in reach of an actor with Strike Reflex. */
    public readonly strikeReflex = false,
  ) {}
}
