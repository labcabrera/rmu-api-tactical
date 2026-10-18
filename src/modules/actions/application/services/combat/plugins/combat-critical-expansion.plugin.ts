import { UnprocessableEntityError } from '../../../../../shared/domain/errors';
import { CombatPlugin } from '../combat-plugin';

/**
 * Severities with a table (Z, A..E) give one critical; F..I give an E plus lighter ones. J is E, C, B: the Python
 * calculator had J, C, B, but there is no J table to roll on.
 */
const CRITICALS_BY_SEVERITY: Record<string, string[]> = {
  Z: ['Z'],
  A: ['A'],
  B: ['B'],
  C: ['C'],
  D: ['D'],
  E: ['E'],
  F: ['E', 'A'],
  G: ['E', 'B'],
  H: ['E', 'C'],
  I: ['E', 'C', 'A'],
  J: ['E', 'C', 'B'],
};

export const CombatCriticalExpansionPlugin: CombatPlugin = {
  id: 'critical-expansion',
  group: 'resolution',
  hooks: {
    afterAttackRoll: [
      {
        condition: ctx => !!ctx.attackTableEntry?.criticalType && !!ctx.attackTableEntry.criticalSeverity,
        apply: ctx => {
          const severity = ctx.attackTableEntry!.criticalSeverity!;
          const severities = CRITICALS_BY_SEVERITY[severity];
          if (!severities) {
            throw new UnprocessableEntityError(`Invalid critical severity: ${severity}`);
          }
          ctx.criticalSeverities = severities;
        },
      },
    ],
  },
};
