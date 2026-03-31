import { ActorRoundPenaltyModifier } from './actor-round-penalty-modifier.vo';
import { ActorRoundPenaltySource } from './actor-round-penalty-source.vo';

export class ActorRoundPenalty {
  constructor(public modifiers: ActorRoundPenaltyModifier[]) {}

  addModifier(source: ActorRoundPenaltySource, value: number): void {
    this.modifiers.push(new ActorRoundPenaltyModifier(crypto.randomUUID(), source, value));
  }
}
