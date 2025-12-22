import { ActorRoundAlertType } from './actor-round-alert-type.vo';

export class ActorRoundAlert {
  constructor(
    public readonly id: string,
    public type: ActorRoundAlertType,
    public readonly value: string | undefined,
  ) {}
}
