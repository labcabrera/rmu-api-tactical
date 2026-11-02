/** Action points an actor spent in an action phase that has ended (spec 007, §10). */
export class ActorRoundPhaseLog {
  constructor(
    /** Action phase (1-4). */
    public readonly phase: number,
    /** Action points spent in the phase: 1 while an action spans it, 0 otherwise. */
    public readonly spentAp: number,
    /** Action points spent in the round up to the end of the phase. */
    public readonly totalSpentAp: number,
  ) {}
}
