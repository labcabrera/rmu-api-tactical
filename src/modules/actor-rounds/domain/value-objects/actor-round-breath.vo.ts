/**
 * Workspace spec 079, C4 (§15.2 Drowning): the actor holds its breath since `sinceRound`, started and stopped by the game
 * master. `limitRounds` is fixed when it starts (12 + Constitution bonus prepared, the bonus alone unprepared, at least
 * 1); past it, each upkeep asks for a `breath-check` alert, one difficulty step harder each round. After a failed check
 * (`failedRound`) the actor suffocates (`suffocating` effect) and no more checks are asked: the book does not say what
 * the later rolls do, so the game master decides (spec 079, decision C4).
 */
export interface ActorRoundBreath {
  sinceRound: number;
  /** It took a breath first (prepared) or was caught unawares. */
  prepared: boolean;
  /** Underwater: a failed check inhales water, stunned -50 until the lungs are cleared. */
  underwater: boolean;
  constitutionBonus: number;
  /** Where the Constitution bonus comes from: the sheet, the request (an NPC) or none (0). */
  constitutionSource: 'sheet' | 'request' | 'none';
  limitRounds: number;
  /**
   * Workspace spec 079, D5: the actor has Breath Holding; its rounds (12 × level, ×2 inactive, ×3 with Meditation) and the
   * game master's flags. Missing or null without the talent.
   */
  breathHolding?: { rounds: number; level: number; inactive: boolean; meditation: boolean } | null;
  /** Round of the failed check; null while the actor still holds its breath. */
  failedRound: number | null;
  note: string | null;
}

export const copyBreath = (breath: ActorRoundBreath | null | undefined): ActorRoundBreath | null => (breath ? { ...breath } : null);
