import { describe, expect, it, vi } from 'vitest';
import {
  COMBAT_PLUGIN_LIST,
  CombatAttackRollResolverService,
  CombatDisarmPlugin,
  CombatMeleeCoverPlugin,
  CombatPluginRegistryService,
  CombatProcessor,
  CombatSubdualDamagePlugin,
  CombatSubdualPlugin,
} from '../../../../src/modules/actions/application/services/combat/index.js';
import type { CombatContext } from '../../../../src/modules/actions/application/services/combat/combat-context.js';
import {
  disarmDefenseModifier,
  disarmResult,
  isDisarmSuccess,
  offsetBySkill,
  pickStrayShotTarget,
  specialManeuverModifier,
  subdualDamage,
  subdualSeverity,
} from '../../../../src/modules/actions/domain/services/special-maneuvers.js';
import { ActionAttackCalculated } from '../../../../src/modules/actions/domain/value-objects/action-attack-calculated.vo.js';
import { AttackTableEntry } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { KeyValueModifier } from '../../../../src/modules/actions/domain/value-objects/key-value-modifier.vo.js';
import { fakeCriticalLocationPort } from '../../../fixtures/critical-locations.js';
import {
  createCombatPluginContext,
  type CombatPluginContextOptions,
  getModifier,
  rollModifierValues,
  runPluginHook,
} from './combat-plugin-test.factory.js';

/** A context being prepared with the table modifier the handler reads from attack-tables. */
const preparing = (options: CombatPluginContextOptions, tableModifier: number | null = null): CombatContext => {
  const ctx = createCombatPluginContext(options);
  ctx.attackPreparation!.modifiers.specialManeuverModifier = tableModifier;
  return ctx;
};

describe('Workspace spec 079, A7: special maneuver rules', () => {
  it('reads the bands of Table 9-7a', () => {
    expect([0, 1, 75, 76, 100, 101, 175, 176].map(disarmResult)).toEqual([
      'absolute-failure',
      'failure',
      'failure',
      'partial',
      'partial',
      'success',
      'success',
      'absolute-success',
    ]);
    expect(isDisarmSuccess('success')).toBe(true);
    expect(isDisarmSuccess('absolute-success')).toBe(true);
    expect(isDisarmSuccess('partial')).toBe(false);
    expect(isDisarmSuccess(undefined)).toBe(false);
  });

  it('turns the defender roll into a bonus below 100 and a penalty above it', () => {
    expect(disarmDefenseModifier(50)).toBe(50);
    expect(disarmDefenseModifier(130)).toBe(-30);
  });

  it('takes the thrown modifier for a thrown attack when the table has one', () => {
    const dagger = { melee: -60, ranged: -160 };
    expect(specialManeuverModifier(dagger, 'melee')).toBe(-60);
    expect(specialManeuverModifier(dagger, 'thrown')).toBe(-160);
    expect(specialManeuverModifier({ melee: -150, ranged: null }, 'ranged')).toBe(-150);
    expect(specialManeuverModifier({ melee: -150, ranged: null }, 'thrown')).toBe(-150);
    expect(specialManeuverModifier(null, 'melee')).toBeNull();
  });

  it('offsets the penalties with the skill down to 0, never with a negative skill', () => {
    expect(offsetBySkill(-75, 40)).toBe(40);
    expect(offsetBySkill(-75, 100)).toBe(75);
    expect(offsetBySkill(-75, -25)).toBe(0);
    expect(offsetBySkill(0, 40)).toBe(0);
  });

  it('halves the subdual hits rounding down and caps the critical at E', () => {
    expect([0, 1, 9, 12].map(subdualDamage)).toEqual([0, 0, 4, 6]);
    expect(['A', 'E', 'F', 'J'].map(subdualSeverity)).toEqual(['A', 'E', 'E', 'E']);
  });

  it('picks a stray shot target at random among the candidates', () => {
    expect(pickStrayShotTarget(['a', 'b', 'c'], () => 0)).toBe('a');
    expect(pickStrayShotTarget(['a', 'b', 'c'], () => 0.5)).toBe('b');
    expect(pickStrayShotTarget(['a', 'b', 'c'], () => 0.9999)).toBe('c');
    expect(pickStrayShotTarget([])).toBeUndefined();
  });
});

describe('Workspace spec 079, A7: disarm plugin (Table 9-7a)', () => {
  it('adds the weapon penalty, the two-handed foe, the Disarm skill offset and the defender roll (Meretor)', async () => {
    const ctx = preparing(
      {
        modifiers: { attackMode: 'disarm', disarmDefenseRoll: 50 },
        sourceSkills: [{ skillId: 'disarm', bonus: 40, ranks: 4 }],
      },
      -75,
    );

    expect(await runPluginHook(CombatDisarmPlugin, 'prepare', ctx)).toBe(true);

    // -75 + 40 = -35, and the peasant's 50 below 100 is a +50 bonus
    expect(rollModifierValues(ctx)).toEqual({ disarm: -75, 'disarm-skill': 40, 'disarm-defense': 50 });
    expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'disarm-defense')).toMatchObject({
      source: 'disarm',
      group: 'offense',
      params: { defenseRoll: 50 },
    });
  });

  it('adds -25 against a two-handed weapon, offset by the skill too, but not the defender roll', async () => {
    const ctx = preparing(
      {
        modifiers: { attackMode: 'disarm', disarmDefenseRoll: 120, disarmTwoHanded: true },
        sourceSkills: [{ skillId: 'disarm', bonus: 200, ranks: 10 }],
      },
      -50,
    );

    await runPluginHook(CombatDisarmPlugin, 'prepare', ctx);

    expect(rollModifierValues(ctx)).toEqual({ disarm: -50, 'disarm-two-handed': -25, 'disarm-skill': 75, 'disarm-defense': -20 });
  });

  it('does not apply to a normal attack', async () => {
    const ctx = preparing({}, -75);
    expect(await runPluginHook(CombatDisarmPlugin, 'prepare', ctx)).toBe(false);
  });
});

describe('Workspace spec 079, A7: subdual plugins (Table 9-7e, §9.7)', () => {
  it('adds the weapon and unfamiliar anatomy penalties, offset by the bonus the game master enters (Karn)', async () => {
    const ctx = preparing({ attackType: 'ranged', modifiers: { attackMode: 'subdual', subdualBonus: 100, unfamiliarAnatomy: true } }, -150);

    expect(await runPluginHook(CombatSubdualPlugin, 'prepare', ctx)).toBe(true);

    expect(rollModifierValues(ctx)).toEqual({ subdual: -150, 'subdual-anatomy': -50, 'subdual-skill': 100 });
  });

  it('halves the hits and turns the critical into a subdual one of at most E', async () => {
    const ctx = createCombatPluginContext({ modifiers: { attackMode: 'subdual' } });
    ctx.attackTableEntry = new AttackTableEntry('15GS', 15, 'S', 'G');

    expect(await runPluginHook(CombatSubdualDamagePlugin, 'afterAttackRoll', ctx)).toBe(true);

    expect(ctx.attackTableEntry).toMatchObject({ damage: 7, criticalType: 'subdual', criticalSeverity: 'E' });
    expect(ctx.attack!.results!.subdualAdjustment).toEqual({ baseDamage: 15, criticalType: 'S', criticalSeverity: 'G' });
  });

  it('keeps an entry without critical without a critical type', async () => {
    const ctx = createCombatPluginContext({ modifiers: { attackMode: 'subdual' } });
    ctx.attackTableEntry = new AttackTableEntry('5', 5, undefined, undefined);

    await runPluginHook(CombatSubdualDamagePlugin, 'afterAttackRoll', ctx);

    expect(ctx.attackTableEntry).toMatchObject({ damage: 2, criticalType: undefined });
  });
});

describe('Workspace spec 079, A6: melee cover plugin (§9.7 Firing into Melee)', () => {
  it('gives partial hard cover for the combatants in the way of a ranged attack', async () => {
    const ctx = preparing({ attackType: 'ranged', modifiers: { meleeCoverActorIds: ['ally-1', 'foe-2'] } });

    expect(await runPluginHook(CombatMeleeCoverPlugin, 'prepare', ctx)).toBe(true);

    expect(rollModifierValues(ctx)).toEqual({ 'melee-cover': -40 });
    expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'melee-cover')).toMatchObject({ params: { actors: 2 } });
  });

  it('is not counted twice when the game master declared the cover', async () => {
    const ctx = preparing({
      attackType: 'ranged',
      modifiers: { meleeCoverActorIds: ['ally-1'] },
      situationalModifiers: { cover: 'hard_half' },
    });

    expect(await runPluginHook(CombatMeleeCoverPlugin, 'prepare', ctx)).toBe(false);

    expect(rollModifierValues(ctx)).toEqual({});
    expect(ctx.skipped).toEqual([expect.objectContaining({ source: 'melee-cover', reason: 'cover-declared' })]);
  });

  it('does not apply to a melee attack nor without combatants in the way', async () => {
    expect(await runPluginHook(CombatMeleeCoverPlugin, 'prepare', preparing({ modifiers: { meleeCoverActorIds: ['a'] } }))).toBe(false);
    expect(await runPluginHook(CombatMeleeCoverPlugin, 'prepare', preparing({ attackType: 'ranged' }))).toBe(false);
  });
});

describe('Workspace spec 079: attack roll of a disarm and of a stray shot', () => {
  /** A prepared attack: OB 80 and DB -20, plus the extra modifiers. */
  const setup = (options: CombatPluginContextOptions, extra: KeyValueModifier[] = []) => {
    const ctx = createCombatPluginContext(options);
    ctx.attack!.calculated = new ActionAttackCalculated(
      [
        new KeyValueModifier('bo', 80, 'offense', 'offensive-bonus'),
        new KeyValueModifier('bd', -20, 'defense', 'defensive-bonus'),
        ...extra,
      ],
      60,
      undefined,
      undefined,
      [],
    );
    const lookup = vi.fn(() => Promise.resolve(new AttackTableEntry('8', 8, undefined, undefined)));
    const processor = new CombatProcessor(new CombatPluginRegistryService(COMBAT_PLUGIN_LIST));
    const resolver = new CombatAttackRollResolverService(processor, { lookup }, fakeCriticalLocationPort());
    const resolve = (roll: number) =>
      resolver.resolve({ action: ctx.action, attack: ctx.attack!, sourceActor: ctx.sourceActor!, targetActor: ctx.targetActor!, roll });
    return { ctx, attack: ctx.attack!, lookup, resolve };
  };
  const disarmModifiers = [
    new KeyValueModifier('disarm', -75, 'offense', 'disarm'),
    new KeyValueModifier('disarm-defense', 30, 'offense', 'disarm'),
  ];

  it('a success makes no attack and keeps the disarm total', async () => {
    const { attack, lookup, resolve } = setup({ modifiers: { attackMode: 'disarm' } }, disarmModifiers);

    // 60 - 45 + 100 = 115
    await resolve(100);

    expect(attack.disarm).toEqual({ result: 'success', total: 115, attackTotal: null, unusual: false });
    expect(lookup).not.toHaveBeenCalled();
    expect(attack.results).toMatchObject({ attackTableEntry: undefined, fumble: undefined });
    expect(attack.status).toBe('pending_apply');
  });

  it('a partial success becomes a normal attack with the same roll without the disarm modifiers', async () => {
    const { attack, lookup, resolve } = setup({ modifiers: { attackMode: 'disarm' } }, disarmModifiers);

    // 60 - 45 + 70 = 85: partial; the attack is 60 + 70 = 130
    await resolve(70);

    expect(attack.disarm).toMatchObject({ result: 'partial', total: 85, attackTotal: 130 });
    expect(lookup).toHaveBeenCalledWith(expect.objectContaining({ roll: 130 }));
    expect(attack.results?.attackTableEntry?.damage).toBe(8);
    expect(attack.calculated?.rollTotal).toBe(85);
  });

  it('an absolute failure fumbles the weapon, and a failure does nothing', async () => {
    const failed = setup({ modifiers: { attackMode: 'disarm' } }, [new KeyValueModifier('disarm', -200, 'offense', 'disarm')]);
    await failed.resolve(50);
    expect(failed.attack.disarm?.result).toBe('absolute-failure');
    expect(failed.attack.results?.fumble?.status).toBe('pending_roll');
    expect(failed.attack.status).toBe('pending_fumble_roll');

    const missed = setup({ modifiers: { attackMode: 'disarm' } }, disarmModifiers);
    await missed.resolve(20);
    expect(missed.attack.disarm?.result).toBe('failure');
    expect(missed.attack.results?.fumble).toBeUndefined();
  });

  it('flags an unmodified 66 for the game master', async () => {
    const { attack, resolve } = setup({ modifiers: { attackMode: 'disarm' } }, disarmModifiers);
    await resolve(66);
    expect(attack.disarm?.unusual).toBe(true);
  });

  it('the second attack of a stray shot ignores fumbles', async () => {
    const { ctx, attack, lookup, resolve } = setup({ attackType: 'ranged', fumble: 5 });
    ctx.action.strayShot = { alertId: 'alert-1', triggerActionId: 'action-0', attackName: 'Longsword', targetActorId: 'defender-1' };

    await resolve(3);

    expect(attack.results?.fumble).toBeUndefined();
    expect(lookup).toHaveBeenCalled();
  });
});
