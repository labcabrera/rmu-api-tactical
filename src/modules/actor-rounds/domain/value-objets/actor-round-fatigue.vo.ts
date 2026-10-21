/** Fatigue penalty points beyond which further fatigue becomes injury (§5.5 Injuries due to Fatigue). */
export const MAX_FATIGUE_PENALTY = 50;

export class ActorRoundFatigue {
  constructor(
    public readonly endurance: number,
    /** Accumulated fatigue penalty (§5.5), as positive points: the actor's penalty is its negative, up to -50. */
    public fatigue: number,
    /** Activity points towards the next endurance roll: one is due at 100. */
    public accumulator: number,
  ) {}

  static empty(): ActorRoundFatigue {
    return new ActorRoundFatigue(0, 0, 0);
  }
}
