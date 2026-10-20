/** Bonus of the attacker against the foe it inflicted a critical on (Pressing the Advantage). */
export const PRESSING_ADVANTAGE = 'pressing-advantage';

/** Penalty to all actions in the round after inflicting a critical (Non-violent). */
export const NON_VIOLENT = 'non-violent';

export class ActorRoundEffect {
  constructor(
    public readonly id: string,
    public readonly status: string,
    public value: number | undefined,
    public rounds: number | undefined,
    /** Round the effect was applied in. Effects stored without it lose a round in every upkeep. */
    public appliedRound?: number,
    /** Phase the effect was applied in: 0 before the action phases, 1-4 in an action phase, 5 in the upkeep. */
    public appliedPhase?: number,
    /** Action points the actor had spent in the round before the effect (§8.3 Upkeep). */
    public spentApBefore?: number,
    /** Actor the effect refers to, such as the foe of a `pressing-advantage`. */
    public targetActorId?: string,
  ) {}

  static isUnique(effect: ActorRoundEffect): boolean {
    switch (effect.status) {
      case 'dead':
      case 'unconcious':
      case 'surprised':
      case 'flatfooted':
        return true;
    }
    return false;
  }

  static isStackable(effect: ActorRoundEffect): boolean {
    switch (effect.status) {
      case 'penalty':
      case 'fatigue':
        return true;
    }
    return false;
  }

  /** Surprise states (§8.3 Surprise): they last the round they are set in, whatever the action points spent. */
  static isRoundBound(effect: ActorRoundEffect): boolean {
    return effect.status === 'surprised' || effect.status === 'flatfooted';
  }
}
