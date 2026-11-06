export class ActorRoundMovement {
  constructor(
    public readonly bmr: number,
    public readonly penalty: number,
    public readonly maxPace: string,
    public readonly baseDifficulty: string,
    /**
     * Workspace spec 079, D2: the armour and load penalty the dodge takes (§9.6), without the allowance of Beast of
     * Burden. Missing (older rounds, NPCs): `penalty`.
     */
    public readonly dodgePenalty?: number,
  ) {}

  /** The penalty of a dodge: `dodgePenalty`, or `penalty` when the round has none. */
  static dodgePenaltyOf(movement: Pick<ActorRoundMovement, 'penalty' | 'dodgePenalty'> | undefined | null): number {
    if (!movement) return 0;
    return typeof movement.dodgePenalty === 'number' ? movement.dodgePenalty : movement.penalty || 0;
  }
}
