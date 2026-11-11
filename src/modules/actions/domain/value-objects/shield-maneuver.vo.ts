import type { Difficulty } from './difficulty.vo.js';
import type { KeyValueModifier } from './key-value-modifier.vo.js';

/** Results of the absolute Shield maneuver that let the shield count (workspace spec 077, decision A1.3). */
export const SHIELD_MANEUVER_PASSED_RESULTS = ['success', 'absolute-success'];

/** Absolute maneuver table the Shield maneuver is read on (workspace spec 077, decision A1.3). */
export const SHIELD_MANEUVER_TABLE = 'generic';

/** Difficulty of the Shield maneuver when none is sent (workspace spec 077, decision A1.3). */
export const SHIELD_MANEUVER_DEFAULT_DIFFICULTY: Difficulty = 'm';

/**
 * The Shield maneuver an attack needs (§9.6 Shields; workspace spec 077, decisions A1.2-A1.5): from the second attack
 * a shield covers in the round, the defender rolls an absolute Shield maneuver for each attack, in the parry step.
 * Only a success or better lets the shield DB and the blocking count.
 */
export interface ShieldManeuver {
  /** Defender whose shield covers the attack. */
  targetId: string;
  required: true;
  /** Shield skill bonus of the defender when the attack was prepared. */
  skill: number;
  /** Shield DB and blocking the attack takes when the maneuver passes, computed when it was prepared. */
  modifiers: KeyValueModifier[];
  roll?: number | null;
  difficulty?: Difficulty | null;
  /** Penalties of the defender (negative) when it rolled. */
  penalty?: number | null;
  total?: number | null;
  /** Result of the absolute maneuver table; null with the game master's shortcut. */
  result?: string | null;
  /** Undefined or null while the maneuver is pending. */
  passed?: boolean | null;
  /** Decided by the game master without a roll (decision A1.4). */
  manual?: boolean;
}

/** The maneuver still waits for its roll or the game master's decision. */
export const isShieldManeuverPending = (maneuver: ShieldManeuver | null | undefined): boolean =>
  !!maneuver?.required && (maneuver.passed === undefined || maneuver.passed === null);
