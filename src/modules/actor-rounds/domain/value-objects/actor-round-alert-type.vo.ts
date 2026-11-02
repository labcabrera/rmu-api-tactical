/**
 * `frenzy-dying`: the physical RR of an actor dying in frenzy, in every upkeep (workspace spec 040). Workspace spec 068:
 * `wound-reopened` (a treated wound bleeds again), `tourniquet-loosen` and `limb-loss` (a tourniquet left too long),
 * `fear-check-suggested` (a faction crossed a threshold of fallen allies) and `revulsion-rr` (the fear RR of the
 * Revulsion flaw).
 */
export type ActorRoundAlertType =
  | 'endurance'
  | 'breakage'
  | 'critical'
  | 'frenzy-dying'
  | 'wound-reopened'
  | 'tourniquet-loosen'
  | 'limb-loss'
  | 'fear-check-suggested'
  | 'revulsion-rr';
