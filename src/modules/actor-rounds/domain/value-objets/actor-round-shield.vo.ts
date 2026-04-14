export class ActorRoundShield {
  constructor(
    public readonly db: number,
    public readonly blockCount: number,
    public readonly currentBlocks: number,
  ) {}
}
