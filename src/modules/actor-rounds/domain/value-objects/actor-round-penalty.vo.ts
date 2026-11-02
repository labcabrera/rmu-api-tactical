import { ActorRoundPenaltyModifier } from './actor-round-penalty-modifier.vo.js';
import type { ActorRoundPenaltySource } from './actor-round-penalty-source.vo.js';

export class ActorRoundPenalty {
  constructor(public modifiers: ActorRoundPenaltyModifier[]) {}

  addModifier(source: ActorRoundPenaltySource, value: number): void {
    this.modifiers.push(new ActorRoundPenaltyModifier(crypto.randomUUID(), source, value));
  }

  static empty(): ActorRoundPenalty {
    return new ActorRoundPenalty([]);
  }
}
