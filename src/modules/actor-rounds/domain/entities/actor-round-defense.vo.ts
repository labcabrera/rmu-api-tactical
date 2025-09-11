export class ActorRoundDefense {
  constructor(
    public readonly bd: number,
    public readonly at: number | undefined,
    public readonly bodyAt: number | undefined,
    public readonly headAt: number | undefined,
    public readonly armsAt: number | undefined,
    public readonly legsAt: number | undefined,
  ) {}
}
