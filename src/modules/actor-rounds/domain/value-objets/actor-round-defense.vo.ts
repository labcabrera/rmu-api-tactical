import { ActorRoundShield } from './actor-round-shield.vo';

export class ActorRoundDefense {
  constructor(
    public readonly bd: number,
    public readonly at: number | undefined,
    public readonly headAt: number | undefined,
    public readonly bodyAt: number | undefined,
    public readonly armsAt: number | undefined,
    public readonly legsAt: number | undefined,
    public readonly shield: ActorRoundShield | undefined,
  ) {}
}
