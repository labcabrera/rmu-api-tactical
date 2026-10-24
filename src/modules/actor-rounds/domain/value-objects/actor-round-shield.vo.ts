export class ActorRoundShield {
  constructor(
    public readonly db: number,
    public readonly blockCount: number,
    /** Attacks blocked this round (§9.6 Shields); reset every round. */
    public currentBlocks: number,
  ) {}
}
