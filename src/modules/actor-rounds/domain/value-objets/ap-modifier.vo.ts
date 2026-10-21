/** How a modifier changes the action points of a round (spec 011, §1). */
export type ApModifierKind = 'bonus' | 'loss' | 'cap' | 'cost-multiplier';

/** What a modifier comes from: an effect of the actor round, or the game master. */
export type ApModifierSource =
  | 'surprised'
  | 'flatfooted'
  | 'staggered'
  | 'haste'
  | 'speed'
  | 'reflexes'
  | 'adrenal-speed'
  | 'hold'
  | 'distraction'
  | 'cap'
  | 'concentration'
  | 'manual';

/** A change to the action point capacity of an actor round, with its origin. */
export class ApModifier {
  constructor(
    public readonly source: ApModifierSource,
    public readonly kind: ApModifierKind,
    /** AP gained or lost, the cap, or the cost multiplier. */
    public readonly value: number,
    /** Phase (1-4) of a loss that falls in a given phase (staggered). Past phase 4: lost in the next round. */
    public readonly phase?: number,
    /** Effect the modifier comes from. */
    public readonly effectId?: string,
  ) {}
}
