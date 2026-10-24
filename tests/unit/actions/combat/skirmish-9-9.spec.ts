// Integration test of spec 007: the attack modifiers of the §9.9 extended example (Kirax and Thyrzia against the
// goat rustlers) that only depend on rules in scope, through every prepare plugin and the critical roll phase.
import { describe, expect, it } from 'vitest';
import {
  COMBAT_PLUGIN_LIST,
  CombatContext,
  CombatModifierBag,
  CombatPluginRegistryService,
  CombatProcessor,
} from '../../../../src/modules/actions/application/services/combat';
import { ActionAttackCalculated } from '../../../../src/modules/actions/domain/value-objects/action-attack-calculated.vo';
import { ActorRoundAttack } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-attack.vo';
import { createCombatPluginContext, rollModifierValues } from './combat-plugin-test.factory';

const processor = new CombatProcessor(new CombatPluginRegistryService(COMBAT_PLUGIN_LIST));

const total = (ctx: CombatContext) => CombatModifierBag.from(ctx.attackPreparation!.modifiers.rollModifiers).sum();

describe('§9.9 extended example', () => {
  it('Kirax: +63 skill, +10 two-handed, +35 rear and -25 for 3 AP against Caitsley', async () => {
    // Round 1, phase 3: a 3 AP attack from behind with a two-handed spear (a Big attack) on a running Caitsley,
    // whose surprise is over and who takes no defensive action.
    const ctx = createCombatPluginContext({
      bo: 63,
      actionPoints: 3,
      twoHanded: true,
      attackSize: 1,
      defense: { bd: 0, at: 3 },
      situationalModifiers: { positionalTarget: 'rear' },
    });

    const prepared = await processor.runPhase('prepare', ctx);

    // Both are medium: the Big spear shifts the critical, not the DB (§9.4).
    expect(rollModifierValues(prepared)).toEqual({ bo: 63, 'two-handed-weapon': 10, 'action-points': -25, 'positional-target': 35 });
    expect(total(prepared)).toBe(83);
  });

  it('Thyrzia: two light weapons with Multiple Attacks +20 and an ambush on a flatfooted Gavart, +62', async () => {
    // Round 1, phase 4: light mace and hand axe (Small attacks) on one foe; Ambidextrous, so the off-hand penalty
    // is not in the OB strategic gives. Gavart is flatfooted: no Quickness DB, +25 surprise and +35 rear.
    const handAxe = new ActorRoundAttack(
      'offHand',
      [],
      37,
      37,
      'melee',
      'hand-axe',
      'melee-one-hand',
      -1,
      2,
      false,
      null,
      null,
      false,
      'light',
    );
    const ctx = createCombatPluginContext({
      bo: 37,
      attackNumber: 2,
      targetsNumber: 1,
      attackSize: -1,
      weaponCategory: 'light',
      otherAttacks: [handAxe],
      sourceSkills: [
        { skillId: 'multiple-attacks', bonus: 20, ranks: 4 },
        { skillId: 'ambush', bonus: 30, ranks: 4 },
      ],
      defense: { bd: 15, at: 3 },
      modifiers: { ambush: true },
      situationalModifiers: { targetStatus: ['flatfooted'] },
    });

    const prepared = await processor.runPhase('prepare', ctx);

    expect(rollModifierValues(prepared)).toEqual({
      bo: 37,
      'flatfooted-target': 25,
      'flatfooted-rear': 35,
      'attack-number': -75,
      'light-weapon': 20,
      'multiple-attacks-skill': 20,
    });
    expect(total(prepared)).toBe(62);
    // Rolls 43 and 88: 105 and 150.
    expect([43, 88].map(roll => roll + total(prepared))).toEqual([105, 150]);

    // The Krush critical rolled 55 and the Slash one 58, each plus the 4 Ambush ranks.
    const { rollModifiers, criticalModifiers } = prepared.attackPreparation!.modifiers;
    prepared.attack!.calculated = new ActionAttackCalculated(rollModifiers, total(prepared), undefined, undefined, criticalModifiers);
    prepared.attackPreparation = undefined;
    const critical = async (roll: number) =>
      (await processor.runPhase('criticalRoll', { action: prepared.action, attack: prepared.attack, criticalRoll: roll, trace: [] }))
        .criticalRoll;
    expect([await critical(55), await critical(58)]).toEqual([59, 62]);
  });
});
