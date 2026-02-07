import { ActorRoundPenaltyModifier } from './actor-round-penalty-modifier.vo';

export class ActorRoundPenalty {
  constructor(public modifiers: ActorRoundPenaltyModifier[]) {}
}
