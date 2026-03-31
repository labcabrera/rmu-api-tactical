import { ActorRoundPenaltySource } from './actor-round-penalty-source.vo';

export class ActorRoundPenaltyModifier {
  constructor(
    public readonly id: string,
    public readonly source: ActorRoundPenaltySource,
    public readonly value: number,
  ) {}
}
