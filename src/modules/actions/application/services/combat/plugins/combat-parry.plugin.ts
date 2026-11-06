import { rollModifiers } from '../combat-modifiers.js';
import type { CombatContext } from '../combat-context.js';
import { skip } from '../combat-phase.js';
import type { CombatPlugin } from '../combat-plugin.js';

/** The defender's own parry against the attack (not a protector's), with its position (workspace spec 079). */
const defenderParry = (ctx: CombatContext) => {
  const targetId = ctx.attack?.modifiers.targetId;
  return (ctx.action.parries || []).find(p => p.actorId === targetId && p.targetActorId === targetId && p.parryType === 'parry');
};

/**
 * The DB the parry gives: 1 per OB, or 1 per 2 OB (rounded up) when restricted.
 */
const parryDb = (parry: number, restricted: boolean | undefined): number => (restricted ? Math.ceil(parry / 2) : parry);

/**
 * The declared parry. A restricted parry (§9.6 Restricted Parrying: unarmed against a weapon, an invisible or
 * incorporeal foe) gives 1 DB per 2 OB, rounded up, as `restricted-parry`.
 *
 * Workspace spec 079, decision A2 (§9.6 Parrying): a defender parrying toward its flank or rear loses 30 or 70 of the DB
 * it gains, offset 1:1 by its Reverse Strike and never more than that DB, as `parry-positional`.
 */
export const CombatParryPlugin: CombatPlugin = {
  id: 'parry',
  group: 'defense',
  rule: '§9.6',
  hooks: {
    parry: [
      {
        condition: ctx => {
          if (!ctx.attack?.calculated) return false;
          return ctx.attack.modifiers.disabledParry && (ctx.attack.modifiers.parry || 0) > 0
            ? skip('parry-disabled')
            : !ctx.attack.modifiers.disabledParry;
        },
        // Replaces the parry of a previous declaration.
        apply: ctx => {
          const parry = ctx.attack!.modifiers.parry || 0;
          const restricted = ctx.attack!.modifiers.restrictedParry;
          const modifiers = rollModifiers(ctx).remove('parry').remove('restricted-parry').remove('parry-positional');
          if (restricted) {
            modifiers.add('restricted-parry', -parryDb(parry, true), { parry });
          } else {
            modifiers.add('parry', -parry, { parry });
          }
          const own = defenderParry(ctx);
          const positional = own?.positional;
          const ownDb = parryDb(own?.parry || 0, restricted);
          if (positional && ownDb > 0) {
            const reduction = Math.min(ownDb, Math.max(0, -positional.penalty - positional.reverseStrike));
            modifiers.add('parry-positional', reduction, {
              position: positional.position,
              penalty: positional.penalty,
              skill: positional.reverseStrike,
              parry: ownDb,
            });
          }
        },
      },
    ],
  },
};
