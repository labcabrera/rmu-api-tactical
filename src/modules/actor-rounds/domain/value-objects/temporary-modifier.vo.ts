/** What a temporary modifier adds to (workspace spec 068, decision 19). */
export type TemporaryModifierKind = 'morale' | 'fear-rr';
export const TEMPORARY_MODIFIER_KINDS: TemporaryModifierKind[] = ['morale', 'fear-rr'];

export type TemporaryModifierSource = 'morale-absolute-success' | 'morale-absolute-failure' | 'rally-unusual' | 'manual';
export const TEMPORARY_MODIFIER_SOURCES: TemporaryModifierSource[] = [
  'morale-absolute-success',
  'morale-absolute-failure',
  'rally-unusual',
  'manual',
];

/**
 * A lasting modifier of an actor (workspace spec 068, decision 19): the result of a morale check or the unusual event of
 * a rally, added to its later morale checks or fear RRs while it lasts. It goes to the character with the outcome of
 * the game, where it expires with the campaign calendar.
 */
export interface TemporaryModifier {
  id: string;
  kind: TemporaryModifierKind;
  value: number;
  source: TemporaryModifierSource;
  /** Days of campaign it lasts; null: until the game master removes it. */
  days: number | null;
  createdAt: string;
  /** The game that created it; null for one brought from the character. */
  tacticalGameId: string | null;
  /** Strategic only: the campaign day it expires (copied from the character, not used by tactical). */
  expiresGameDay?: number | null;
}

/** Rule references of the temporary modifiers (Core Law). */
export const TEMPORARY_MODIFIER_RULES: Record<TemporaryModifierKind, string> = {
  morale: '§14.3 Table 14-3b',
  'fear-rr': '§14.3 Table 14-3c',
};

/** One unit or more of a strategic item spent in the game (workspace spec 068, decision 7). */
export interface ItemConsumed {
  itemId: string;
  amount: number;
}
