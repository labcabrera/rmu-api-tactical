/**
 * `frenzy-dying`: the physical RR of an actor dying in frenzy, in every upkeep (workspace spec 040). Workspace spec 068:
 * `wound-reopened` (a treated wound bleeds again), `tourniquet-loosen` and `limb-loss` (a tourniquet left too long),
 * `fear-check-suggested` (a faction crossed a threshold of fallen allies) and `revulsion-rr` (the fear RR of the
 * Revulsion flaw). Workspace spec 076: `reaction-available` (a reaction talent can attack out of turn, see
 * `ReactionAlertData`) and `terrible-luck` (a natural 01 of an actor with Terrible Luck, narrated by the game master).
 * Workspace spec 077: `mental-focus` (a Mental Focus maneuver to keep the concentration: double, stunned or extended)
 * and `fall-suggested` (an absolute failure of a climbing or jumping maneuver or movement: the game master may resolve
 * a fall, decision D5). Workspace spec 079: `death-threshold` (total penalties of -300 or worse: the game master confirms
 * the death, decision A3) and `knocked-back` (a critical knocked the actor back, decision A4).
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
  | 'revulsion-rr'
  | 'reaction-available'
  | 'terrible-luck'
  | 'mental-focus'
  | 'fall-suggested'
  | 'death-threshold'
  | 'knocked-back';
