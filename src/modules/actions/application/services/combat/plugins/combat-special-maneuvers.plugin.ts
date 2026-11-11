import {
  disarmDefenseModifier,
  DISARM_TWO_HANDED_PENALTY,
  MELEE_COVER_DEFAULT,
  offsetBySkill,
  SUBDUAL_CRITICAL_TYPE,
  SUBDUAL_UNFAMILIAR_ANATOMY_PENALTY,
  subdualDamage,
  subdualSeverity,
} from '../../../../domain/services/special-maneuvers.js';
import { ActionAttackResult } from '../../../../domain/value-objects/action-attack.vo.js';
import type { CombatContext } from '../combat-context.js';
import { isMelee, isPreparing, preparation, rollModifiers, sourceSkill } from '../combat-modifiers.js';
import { skip } from '../combat-phase.js';
import type { CombatPlugin } from '../combat-plugin.js';

const attackMode = (ctx: CombatContext) => ctx.attack?.modifiers.attackMode ?? 'normal';

/** The disarm or subdual modifier of the weapon's table, as the prepare handler read it. */
const tableModifier = (ctx: CombatContext): number => preparation(ctx).specialManeuverModifier ?? 0;

/**
 * Workspace spec 079, decision A7 (Table 9-7a): a disarm. The weapon's disarm modifier and the one of a two-handed foe
 * weapon, offset by the Disarm skill down to 0, and the defender's roll entered: 100 less its total.
 */
export const CombatDisarmPlugin: CombatPlugin = {
  id: 'disarm',
  group: 'offense',
  rule: 'Table 9-7a',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && attackMode(ctx) === 'disarm',
        apply: ctx => {
          const modifiers = ctx.attack!.modifiers;
          const bag = rollModifiers(ctx);
          const weapon = tableModifier(ctx);
          const twoHanded = modifiers.disarmTwoHanded ? DISARM_TWO_HANDED_PENALTY : 0;
          const skill = sourceSkill(ctx, 'disarm');
          bag.add('disarm', weapon, { table: preparation(ctx).attackTable });
          bag.add('disarm-two-handed', twoHanded);
          bag.add('disarm-skill', offsetBySkill(weapon + twoHanded, skill), { skill, penalty: weapon + twoHanded });
          const defenseRoll = modifiers.disarmDefenseRoll ?? 0;
          bag.add('disarm-defense', disarmDefenseModifier(defenseRoll), { defenseRoll });
        },
      },
    ],
  },
};

/**
 * Workspace spec 079, decision A7 (Table 9-7e): a subdual attack. The weapon's subdual modifier and an unfamiliar anatomy,
 * offset by the subdual bonus the game master enters (not a Core Law skill) down to 0.
 */
export const CombatSubdualPlugin: CombatPlugin = {
  id: 'subdual',
  group: 'offense',
  rule: 'Table 9-7e',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && attackMode(ctx) === 'subdual',
        apply: ctx => {
          const modifiers = ctx.attack!.modifiers;
          const bag = rollModifiers(ctx);
          const weapon = tableModifier(ctx);
          const anatomy = modifiers.unfamiliarAnatomy ? SUBDUAL_UNFAMILIAR_ANATOMY_PENALTY : 0;
          const skill = modifiers.subdualBonus ?? 0;
          bag.add('subdual', weapon, { table: preparation(ctx).attackTable });
          bag.add('subdual-anatomy', anatomy);
          bag.add('subdual-skill', offsetBySkill(weapon + anatomy, skill), { skill, penalty: weapon + anatomy });
        },
      },
    ],
  },
};

/**
 * Workspace spec 079, decision A7 (§9.7 Subdual): half the hits, and the critical on the subdual table at most E. Runs
 * after the attack size moved the severity and before the critical expansion, so an F or worse is a single E.
 */
export const CombatSubdualDamagePlugin: CombatPlugin = {
  id: 'subdual-damage',
  group: 'resolution',
  rule: '§9.7',
  hooks: {
    afterAttackRoll: [
      {
        condition: ctx => attackMode(ctx) === 'subdual' && !!ctx.attackTableEntry,
        apply: ctx => {
          const entry = ctx.attackTableEntry!;
          const adjustment = {
            baseDamage: entry.damage,
            criticalType: entry.criticalType ?? null,
            criticalSeverity: entry.criticalSeverity ?? null,
          };
          entry.damage = subdualDamage(entry.damage);
          if (entry.criticalType && entry.criticalSeverity) {
            entry.criticalType = SUBDUAL_CRITICAL_TYPE;
            entry.criticalSeverity = subdualSeverity(entry.criticalSeverity);
          }
          if (ctx.attack) {
            ctx.attack.results ??= new ActionAttackResult(entry, undefined, undefined);
            ctx.attack.results.subdualAdjustment = adjustment;
          }
        },
      },
    ],
  },
};

/**
 * Workspace spec 079, decision A6 (§9.7 Firing into Melee, Table 9-5): the combatants engaged with the target of a ranged
 * attack are hard cover, partial by default. A cover declared by the game master already counts them: it is not added
 * twice.
 */
export const CombatMeleeCoverPlugin: CombatPlugin = {
  id: 'melee-cover',
  group: 'situation',
  rule: '§9.7',
  hooks: {
    prepare: [
      {
        condition: ctx => {
          const actors = ctx.attack?.modifiers.meleeCoverActorIds ?? [];
          if (!isPreparing(ctx) || isMelee(ctx) || actors.length === 0) return false;
          return preparation(ctx).situationalModifiers.cover === 'none' ? true : skip('cover-declared');
        },
        apply: ctx =>
          void rollModifiers(ctx).add('melee-cover', MELEE_COVER_DEFAULT, { actors: ctx.attack!.modifiers.meleeCoverActorIds!.length }),
      },
    ],
  },
};
