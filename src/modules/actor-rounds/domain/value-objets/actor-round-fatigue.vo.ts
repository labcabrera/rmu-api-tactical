export class ActorRoundFatigue {
  constructor(
    public readonly endurance: number,
    public readonly fatigue: number,
    public accumulator: number,
  ) {}

  static empty(): ActorRoundFatigue {
    return new ActorRoundFatigue(0, 0, 0);
  }
}
