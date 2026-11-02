export class ActorRoundHP {
  constructor(
    public readonly max: number,
    public current: number,
    /**
     * Hits below zero the actor survives (§9.8 Hits): its Body Development bonus. It dies when `current` goes below
     * `-deathThreshold`. Missing in actor rounds stored before it existed, which fall back to `max`.
     */
    public readonly deathThreshold?: number,
  ) {}
}
