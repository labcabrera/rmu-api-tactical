export class ActorRoundAlertModifier {
  constructor(
    public readonly key: string,
    public readonly value: number | null,
    public readonly modifier: string | null,
  ) {}
}
