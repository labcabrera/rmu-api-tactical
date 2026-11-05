/** Fatigue penalty points beyond which further fatigue becomes injury (§5.5 Injuries due to Fatigue). */
export const MAX_FATIGUE_PENALTY = 50;

/** Rounds of 5 seconds in a minute (§8; workspace spec 077, P15). */
export const ROUNDS_PER_MINUTE = 12;

/**
 * §5.5 Recovery: a minute of rest takes one point of fatigue away (workspace spec 077, decision D7): 12 rounds of rest,
 * twice as many at altitude.
 */
export const REST_ROUNDS_PER_POINT = ROUNDS_PER_MINUTE;
export const ALTITUDE_REST_ROUNDS_PER_POINT = 2 * ROUNDS_PER_MINUTE;

export class ActorRoundFatigue {
  constructor(
    /** Endurance bonus of the actor: Body Development plus the racial bonus (workspace spec 077, decision D9). */
    public readonly endurance: number,
    /** Accumulated fatigue penalty (§5.5), as positive points: the actor's penalty is its negative, up to -50. */
    public fatigue: number,
    /** Activity points towards the next endurance roll: one is due at 100. */
    public accumulator: number,
    /** Rounds in a row without exertion (workspace spec 077, decision D7). */
    public restRounds = 0,
    /** The actor did something that adds fatigue this round (P14: walking does not); reset every round. */
    public exerted = false,
  ) {}

  static empty(): ActorRoundFatigue {
    return new ActorRoundFatigue(0, 0, 0);
  }

  /** A fatigue read from storage or built by hand, as an instance with the fields added later. */
  static from(stored: Partial<ActorRoundFatigue> | null | undefined): ActorRoundFatigue {
    return new ActorRoundFatigue(
      stored?.endurance ?? 0,
      stored?.fatigue ?? 0,
      stored?.accumulator ?? 0,
      stored?.restRounds ?? 0,
      stored?.exerted ?? false,
    );
  }
}
