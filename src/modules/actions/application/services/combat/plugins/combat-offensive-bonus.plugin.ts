import type { CombatContext } from '../combat-context.js';
import { isPreparing, preparation, rollModifiers } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

/** The fixed OB of a reaction (Riposte, workspace spec 076, decision B2); null when the attack uses the OB declared. */
export const reactionObOverride = (ctx: CombatContext): number | null => {
  const reaction = ctx.attack?.reaction ?? (ctx.action.isReaction?.() ? ctx.action.reaction : null);
  return reaction?.obOverride ?? null;
};

/**
 * The OB declared for the attack (§9.5). A reaction with a fixed OB (Riposte) uses it instead; the situational
 * modifiers still apply (workspace spec 076, decision B2).
 */
export const CombatOffensiveBonusPlugin: CombatPlugin = {
  id: 'offensive-bonus',
  group: 'offense',
  rule: '§9.5',
  hooks: {
    prepare: [
      {
        condition: isPreparing,
        apply: ctx => {
          const override = reactionObOverride(ctx);
          if (override !== null) {
            rollModifiers(ctx).add('bo', override, { obOverride: override });
          } else {
            rollModifiers(ctx).add('bo', preparation(ctx).bo);
          }
        },
      },
    ],
  },
};
