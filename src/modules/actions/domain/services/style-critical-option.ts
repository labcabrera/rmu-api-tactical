import {
  activeStyleAbility,
  type ActorRoundActiveStyle,
} from '../../../actor-rounds/domain/value-objects/actor-round-fighting-style.vo.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { Critical, CriticalStyleOption } from '../value-objects/critical.vo.js';

/** Fighting style abilities decided with the attack (workspace spec 032, group C). */
export const ATTACK_STYLE_OPTIONS = ['leg-sweep', 'weapon-breaker', 'binding-chain'];
/** Fighting style abilities that can still be decided after the attack roll, before the critical roll. */
export const CRITICAL_STYLE_OPTIONS = ['overbearing', 'redirect', 'slowing-shot', 'lancers-knockback'];
export const STYLE_CRITICAL_OPTIONS = [...ATTACK_STYLE_OPTIONS, ...CRITICAL_STYLE_OPTIONS];

/** Binding Chain makes the criticals Grapple; Overbearing makes them Unbalancing. */
const CRITICAL_TYPE_BY_OPTION: Record<string, string> = { 'binding-chain': 'G', overbearing: 'U' };
const SEVERITIES = ['A', 'B', 'C', 'D', 'E'];

/** The option is one of the group and an ability of the attacker's active style that works with the attack. */
export const checkStyleCriticalOption = (style: ActorRoundActiveStyle | null | undefined, attackName: string, abilityId: string): void => {
  if (!STYLE_CRITICAL_OPTIONS.includes(abilityId) || !activeStyleAbility(style, abilityId, attackName)) {
    throw new ValidationError(`The active fighting style does not give ${abilityId} with ${attackName}`, 'err-style-critical-option');
  }
};

/**
 * Changes the criticals of the attack before they are rolled. The type changes apply to every critical; the severity
 * goes down one step only in the first one (the most severe). An A critical stays A. The rest of the effect
 * (knockback, trip, breakage check, slowing) is left to the game master with the option recorded on the critical.
 */
export const applyStyleCriticalOption = (criticals: Critical[], abilityId: string): void => {
  const type = CRITICAL_TYPE_BY_OPTION[abilityId];
  criticals.forEach((critical, index) => {
    const option: CriticalStyleOption = {
      abilityId,
      originalType: critical.criticalType,
      originalSeverity: critical.criticalSeverity,
    };
    if (type) critical.criticalType = type;
    const severity = SEVERITIES.indexOf(critical.criticalSeverity);
    if (!type && index === 0 && severity > 0) critical.criticalSeverity = SEVERITIES[severity - 1];
    critical.styleOption = option;
  });
};
