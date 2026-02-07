export class ActorRoundPenaltyModifier {
  constructor(
    public readonly source: 'critical' | 'endurance' | 'hp',
    public readonly value: number,
  ) {}
}
