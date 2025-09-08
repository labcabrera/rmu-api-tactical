export class ActorRoundInitiative {
  constructor(
    public base: number,
    public penalty: number,
    public roll: number | undefined,
    public total: number | undefined,
  ) {}
}
