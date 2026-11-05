/**
 * What the actor concentrates on (§8.1 Concentration; workspace spec 077, decision A2.1): a partial dodge or block
 * (§9.6), a held action (§8.3), the preparation of a spell, keeping afloat or on a climb (Table 8-1), or anything else
 * the game master sets.
 */
export type ConcentrationKind =
  | 'partial-dodge'
  | 'partial-block'
  /** A full dodge declared with Adrenal Defense (workspace spec 079, decision B3). */
  | 'full-dodge'
  | 'held-action'
  | 'spell-preparation'
  | 'hold-position'
  | 'manual';

/** Kinds the game master sets with a `concentrating` effect; the others are derived from the round. */
export const CONCENTRATING_EFFECT_KINDS: ConcentrationKind[] = ['spell-preparation', 'hold-position', 'manual'];

/**
 * Effect of a concentration the game master sets (workspace spec 077, decision A2.1): `data.kind` (one of
 * `CONCENTRATING_EFFECT_KINDS`, `manual` by default), `data.note`, `data.since` (round it started, the current one by
 * default) and `data.actionId` (the action it is for, such as the spell prepared).
 */
export const CONCENTRATING = 'concentrating';

/** Each AP of another action counts half while concentrating (decision A2.2). */
export const CONCENTRATION_COST_MULTIPLIER = 2;

/** A focus held this long asks for a Mental Focus maneuver, and again every as many rounds (§5.5; decision A2.6). */
export const MENTAL_FOCUS_EXTENDED_ROUNDS = 6;

/** Why a Mental Focus maneuver is due (decisions A2.4-A2.6). */
export type MentalFocusReason = 'double' | 'stunned' | 'extended';

/** Outcome of a Mental Focus maneuver the game master marks on its alert (decision A2.4). */
export type MentalFocusOutcome = 'passed' | 'failed';

export const MENTAL_FOCUS_OUTCOMES: MentalFocusOutcome[] = ['passed', 'failed'];

/** One thing the actor concentrates on. */
export interface ConcentrationFocus {
  kind: ConcentrationKind;
  /** The held action, or the action of a `concentrating` effect. */
  actionId?: string;
  /** The `concentrating` effect it comes from. */
  effectId?: string;
  /** Round it started (held actions and effects): a partial dodge or block lasts its round. */
  since?: number;
  note?: string;
}

/** A held action of the actor (§8.3), kept on its actor round while it waits (decision A2.1). */
export interface HeldActionFocus {
  actionId: string;
  /** Round it was first held in. */
  since: number;
}

/** An action as the concentration sees it: its id, status, and the action it continues from the previous round. */
export interface ConcentrationSourceAction {
  id: string;
  status: string;
  continuesActionId?: string | null;
}
