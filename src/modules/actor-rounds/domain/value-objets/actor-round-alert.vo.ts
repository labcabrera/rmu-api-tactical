import { AlertModifier } from './actor-round-alert-modifier.vo';
import type { ActorRoundAlertStatus } from './actor-round-alert-status.vo';
import { ActorRoundAlertType } from './actor-round-alert-type.vo';

export class ActorRoundAlert {
  constructor(
    public readonly id: string,
    public type: ActorRoundAlertType,
    public readonly message: string,
    public readonly modifiers?: AlertModifier[],
    public status: ActorRoundAlertStatus = 'pending',
  ) {}
}
