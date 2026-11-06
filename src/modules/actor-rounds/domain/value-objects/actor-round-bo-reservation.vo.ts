/**
 * OB an action has committed and not spent for good yet (workspace spec 083, ADR 0013): the parries of the actor against
 * one attack, or the attacks of one action of the actor once rolled.
 */
export interface ActorRoundBoReservation {
  actionId: string;
  kind: 'parry' | 'attack';
  /** The OB the parries take, the protect penalty included. */
  parry?: number;
  /** The OB each attack of the action uses. */
  spends?: { attackName: string; bo: number }[];
}
