import { capSeverity } from '../../../shared/domain/severity.js';

/**
 * Special maneuvers of §9.7 (workspace spec 079, block A, decisions A6 and A7): disarming, subdual and firing into
 * melee. Only numbers and the bands of the tables; no rule text.
 */

/** How an attack is made: a normal attack, a disarm (Table 9-7a) or a subdual attack (Table 9-7e). */
export type AttackMode = 'normal' | 'disarm' | 'subdual';
export const ATTACK_MODES: AttackMode[] = ['normal', 'disarm', 'subdual'];

/** Table 9-7a: disarming a weapon wielded with both hands. */
export const DISARM_TWO_HANDED_PENALTY = -25;
/** Table 9-7e: a target of unfamiliar anatomy. */
export const SUBDUAL_UNFAMILIAR_ANATOMY_PENALTY = -50;
/** §9.7 Subdual: the most severe subdual critical. */
export const SUBDUAL_MAX_SEVERITY = 'E';
/** Critical type of the subdual tables (rmu-api-attack-tables `critical/subdual-*.json`). */
export const SUBDUAL_CRITICAL_TYPE = 'subdual';
/** §9.7 Firing into Melee: the partial hard cover a combatant in the way gives by default (ranged: -20 × 2). */
export const MELEE_COVER_DEFAULT = -40;
/** The defender's roll of a disarm is read against 100: what it is over is a penalty, what it is under a bonus. */
export const DISARM_DEFENSE_PIVOT = 100;

/** Result bands of Table 9-7a. */
export type DisarmResult = 'absolute-failure' | 'failure' | 'partial' | 'success' | 'absolute-success';

/** The band of Table 9-7a a disarm total falls in: below 1, 1-75, 76-100, 101-175 and 176 or more. */
export const disarmResult = (total: number): DisarmResult => {
  if (total < 1) return 'absolute-failure';
  if (total <= 75) return 'failure';
  if (total <= 100) return 'partial';
  if (total <= 175) return 'success';
  return 'absolute-success';
};

/** The foe's weapon falls: a success or an absolute success. */
export const isDisarmSuccess = (result: DisarmResult | undefined | null): boolean => result === 'success' || result === 'absolute-success';

/** The modifier of the defender's roll to the disarm total: 100 less its total (Table 9-7a, example of Meretor). */
export const disarmDefenseModifier = (defenseRoll: number): number => DISARM_DEFENSE_PIVOT - defenseRoll;

/**
 * The disarm or subdual modifier of the weapon (rmu-api-attack-tables, per attack table): the thrown one when the attack
 * is thrown and the table gives it, otherwise the other one. Null when the maneuver does not apply.
 */
export const specialManeuverModifier = (
  modifier: { melee: number; ranged: number | null } | null | undefined,
  attackType: string,
): number | null => {
  if (!modifier) return null;
  return attackType === 'thrown' && modifier.ranged !== null ? modifier.ranged : modifier.melee;
};

/** The part of the penalties a skill offsets, never more than the penalties (Tables 9-7a and 9-7e): 0 for a negative skill. */
export const offsetBySkill = (penalty: number, skill: number): number => Math.min(Math.abs(Math.min(0, penalty)), Math.max(0, skill));

/** §9.7 Subdual: half the hits, rounded down. */
export const subdualDamage = (damage: number): number => Math.floor(damage / 2);

/** §9.7 Subdual: the severity of the critical, at most E. */
export const subdualSeverity = (severity: string): string => capSeverity(severity, SUBDUAL_MAX_SEVERITY) ?? severity;

/**
 * §9.7 Firing into Melee: the combatant a missed shot may hit, chosen at random among those that gave cover. `random` is a
 * number in [0, 1), `Math.random` by default.
 */
export const pickStrayShotTarget = (candidates: string[], random: () => number = Math.random): string | undefined => {
  if (candidates.length === 0) return undefined;
  return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
};
