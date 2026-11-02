export class ActorRoundInitiative {
  constructor(
    public base: number,
    public penalty: number,
    public roll: number | undefined,
    public total: number | undefined,
    /** Strike Reflex bonus declared with the roll, already in `total`. */
    public strikeReflex?: number,
    /** Reflexes effect bonus (+10, +15 or +20) declared with the roll, already in `total`. */
    public reflexes?: number,
    /** Fighting style bonus (Lightning Reflexes, spec 032), already in `total`. */
    public style?: number,
  ) {}
}
