export class ActorRoundInitiative {
  constructor(
    public readonly base: number,
    public readonly penalty: number,
    public readonly roll: number | undefined,
    public readonly total: number | undefined,
  ) {}
}
