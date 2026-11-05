import { expandSeverity } from '../../../../../shared/domain/severity.js';
import type { CombatPlugin } from '../combat-plugin.js';

/** The criticals of a severity (§9.4): one for A..E, an E plus lighter ones above it (shared, workspace spec 077). */
export const CombatCriticalExpansionPlugin: CombatPlugin = {
  id: 'critical-expansion',
  group: 'resolution',
  rule: '§9.4',
  hooks: {
    afterAttackRoll: [
      {
        condition: ctx => !!ctx.attackTableEntry?.criticalType && !!ctx.attackTableEntry.criticalSeverity,
        apply: ctx => {
          ctx.criticalSeverities = expandSeverity(ctx.attackTableEntry!.criticalSeverity!);
        },
      },
    ],
  },
};
