import { describe, expect, it } from 'vitest';
import { CombatAttackSizeDamagePlugin, CombatAttackSizePlugin } from '../../../src/modules/actions/application/services/combat/index.js';
import type { CombatContext } from '../../../src/modules/actions/application/services/combat/combat-context.js';
import {
  magicalExpertiseModifiers,
  scrModifiers,
  failureRollModifier,
  type SpellcastingTables,
} from '../../../src/modules/actions/domain/services/spell-casting.rules.js';
import { ActionAttackCalculated } from '../../../src/modules/actions/domain/value-objects/action-attack-calculated.vo.js';
import { ActionAttackResult, AttackTableEntry } from '../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { DEFAULT_SPELL_OPTIONS } from '../../../src/modules/actions/domain/value-objects/action-spell.vo.js';
import { KeyValueModifier } from '../../../src/modules/actions/domain/value-objects/key-value-modifier.vo.js';
import { effect } from '../actor-rounds/actor-round-test.factory.js';
import { createCombatPluginContext, runPluginHook } from './combat/combat-plugin-test.factory.js';

/* Workspace spec 079, decisions B3 and B4: invented numbers. */

const resolved = (entry: AttackTableEntry, ...args: Parameters<typeof createCombatPluginContext>): CombatContext => {
  const ctx = createCombatPluginContext(...args);
  ctx.attack!.calculated = new ActionAttackCalculated([new KeyValueModifier('bo', 75)], 75, undefined, undefined, []);
  ctx.attackPreparation = undefined;
  ctx.attackTableEntry = entry;
  ctx.attack!.results = new ActionAttackResult(entry, undefined, undefined);
  return ctx;
};

describe('Adrenal Strength in the attacks (§3.4)', () => {
  it('a melee attack is one size larger for its critical and its damage', async () => {
    const options = { attackSize: 0, sourceEffects: [effect('adrenal-strength', 1, 2)] };
    const critical = resolved(new AttackTableEntry('10BS', 10, 'S', 'B'), options);
    await runPluginHook(CombatAttackSizePlugin, 'afterAttackRoll', critical);
    expect(critical.attackTableEntry!.criticalSeverity).toBe('C');
    expect(critical.attack!.results!.severityAdjustment!.steps).toEqual([{ key: 'adrenal-strength', value: 1 }]);

    const damage = resolved(new AttackTableEntry('10', 10, undefined, undefined), options);
    expect(await runPluginHook(CombatAttackSizeDamagePlugin, 'afterAttackRoll', damage)).toBe(true);
    expect(damage.attackTableEntry!.damage).toBe(15);
  });

  it('the doubled round gives two sizes, and the absolute failure one less', async () => {
    const doubled = resolved(new AttackTableEntry('10BS', 10, 'S', 'B'), { sourceEffects: [effect('adrenal-strength', 2, 1)] });
    await runPluginHook(CombatAttackSizePlugin, 'afterAttackRoll', doubled);
    expect(doubled.attackTableEntry!.criticalSeverity).toBe('D');
    const failed = resolved(new AttackTableEntry('10BS', 10, 'S', 'B'), { sourceEffects: [effect('adrenal-strength', -1, 1)] });
    await runPluginHook(CombatAttackSizePlugin, 'afterAttackRoll', failed);
    expect(failed.attackTableEntry!.criticalSeverity).toBe('A');
  });

  it('a ranged attack is not changed', async () => {
    const ctx = resolved(new AttackTableEntry('10BS', 10, 'S', 'B'), {
      attackType: 'ranged',
      sourceEffects: [effect('adrenal-strength', 1, 1)],
    });
    expect(await runPluginHook(CombatAttackSizePlugin, 'afterAttackRoll', ctx)).toBe(false);
  });
});

const byColumn = (value: number) => ({ essence: value, channeling: value, mentalism: value });
const TABLES: SpellcastingTables = {
  columns: ['essence', 'channeling', 'mentalism'],
  subtlety: { elemental: byColumn(-40) },
  hands: { none: byColumn(-20), two: byColumn(0) },
  voice: { none: byColumn(-30), normal: byColumn(0) },
  helmet: { heavy: byColumn(-50) },
  armor: {},
  fastCastingPerAp: -25,
  overcastingPerLevel: -20,
  preparation: { perRound: 10, max: 20 },
};

describe('Magical Expertise in the Spellcasting Roll (§3.14)', () => {
  it('each skill takes off the penalties it offsets, never more', () => {
    const penalties = [
      new KeyValueModifier('overcasting', -40),
      new KeyValueModifier('subtlety', -40),
      new KeyValueModifier('hands', -20),
      new KeyValueModifier('helmet', -50),
    ];
    const lines = magicalExpertiseModifiers({ grace: 25, spellTrickery: 80, transcendence: -10 }, penalties);
    expect(lines.map(line => [line.key, line.value, line.group])).toEqual([
      ['grace', 25, 'magical-expertise'],
      ['spell-trickery', 60, 'magical-expertise'],
    ]);
  });

  it('enters the SCR after the casting penalties, and the failure roll reads the reduced ones', () => {
    const modifiers = scrModifiers(
      {
        spell: {
          spellId: 's',
          name: 'Invented',
          level: 7,
          typeCode: 'E',
          type: 'elemental',
          subtype: null,
          instant: true,
          powerPoints: 7,
          listCode: 'invented-list',
          listName: 'Invented',
          listRealms: ['mentalism'],
          resistance: null,
          range: null,
          area: null,
          duration: null,
          effects: [],
        },
        caster: { realms: ['mentalism'], realmStatBonus: 0, level: 5, listSkillId: 'base-spell-list', ranks: 10, listTypeModifier: 0 },
        options: { ...DEFAULT_SPELL_OPTIONS, helmet: 'heavy' },
        apPenalty: 0,
        penalties: [],
        expertise: { grace: 50, transcendence: 15 },
      },
      TABLES,
    );
    const values = Object.fromEntries(modifiers.map(modifier => [modifier.key, modifier.value]));
    expect(values).toMatchObject({ helmet: -50, overcasting: -40, grace: 40, transcendence: 15 });
    expect(failureRollModifier(modifiers)).toBe(35);
  });
});
