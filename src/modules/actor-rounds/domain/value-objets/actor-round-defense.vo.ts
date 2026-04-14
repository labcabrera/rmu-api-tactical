import { ActorRoundShield } from './actor-round-shield.vo';

export class ActorRoundDefense {
  constructor(
    public readonly bd: number,
    public readonly at: number | null,
    public readonly headAt: number | null,
    public readonly bodyAt: number | null,
    public readonly armsAt: number | null,
    public readonly legsAt: number | null,
    public readonly shield: ActorRoundShield | null,
  ) {}
}
