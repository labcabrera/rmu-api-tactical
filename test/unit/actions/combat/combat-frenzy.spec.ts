import { describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import {
  CombatAttackSizePlugin,
  CombatDefensiveBonusPlugin,
  CombatDodgePlugin,
  CombatFrenzyPlugin,
  CombatParryPlugin,
  CombatShieldPlugin,
  CombatSurvivalInstinctPlugin,
} from '../../../../src/modules/actions/application/services/combat/index.js';
import { ActionAttackCalculated } from '../../../../src/modules/actions/domain/value-objects/action-attack-calculated.vo.js';
import { ActionParry } from '../../../../src/modules/actions/domain/value-objects/action-attack-parry.vo.js';
import { AttackTableEntry } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { ActorRoundAttack } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-attack.vo.js';
import { ActorRoundDefenseMode } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-defense-mode.vo.js';
import { ActorRoundEffect } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import type { ActorRoundActiveStyle } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-fighting-style.vo.js';
import { ActorRoundShield } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-shield.vo.js';
import { ActorRoundTrait } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import type { CombatContext } from '../../../../src/modules/actions/application/services/combat/combat-context.js';
import {
  type CombatPluginContextOptions,
  createCombatPluginContext,
  rollModifierValues,
  runPluginHook,
} from './combat-plugin-test.factory.js';

const frenzy = (level = 1) => new ActorRoundEffect(randomUUID(), 'frenzy', level, undefined);

const meleeAttack = (attackName: string, currentBo: number, skillId: string | null) =>
  new ActorRoundAttack(
    attackName,
    [],
    currentBo,
    currentBo,
    'melee',
    'arming-sword',
    'melee-one-hand',
    0,
    3,
    false,
    1,
    null,
    false,
    'standard',
    skillId,
  );

const parry = (parried: number, available: number, options: { type?: 'parry' | 'protect'; carriedOver?: boolean; full?: boolean } = {}) =>
  new ActionParry(
    randomUUID(),
    options.type === 'protect' ? 'protector-1' : 'defender-1',
    'defender-1',
    options.type ?? 'parry',
    available,
    parried,
    undefined,
    undefined,
    options.carriedOver,
    options.full,
  );

const heedlessFury = (): ActorRoundActiveStyle => ({
  skillId: 'battle-styles',
  styleId: 'berserker',
  met: true,
  attackNames: null,
  freeRanksBonus: 0,
  abilities: [{ abilityId: 'heedless-fury', times: 1, met: true, attackNames: null }],
  warnings: [],
  options: [],
});

describe('Survival Instinct (spec 040, decisions 3-6)', () => {
  const parried = async (
    parries: ActionParry[],
    specialization: string | null = 'melee-weapon@blade',
    attackSkill = 'melee-weapon@blade',
  ) => {
    const ctx = createCombatPluginContext({
      parry: parries.reduce((sum, p) => sum + p.parry, 0),
      targetTraits: [new ActorRoundTrait('survival-instinct', 1, specialization)],
      targetAttacks: [meleeAttack('mainHand', 60, attackSkill), meleeAttack('offHand', 30, 'melee-weapon@hafted')],
    });
    ctx.attackPreparation = undefined;
    ctx.attack!.calculated = { rollModifiers: [] } as unknown as ActionAttackCalculated;
    ctx.action.parries = parries;
    await runPluginHook(CombatParryPlugin, 'parry', ctx);
    await runPluginHook(CombatSurvivalInstinctPlugin, 'parry', ctx);
    return rollModifierValues(ctx);
  };

  it('gives +25 DB to a parry with all the available OB', async () => {
    expect(await parried([parry(50, 50)])).toEqual({ parry: -50, 'survival-instinct': -25 });
  });

  it('gives nothing to a partial parry', async () => {
    expect(await parried([parry(40, 50)])).toEqual({ parry: -40 });
  });

  it('counts a carried-over parry only when the first one was full', async () => {
    expect(await parried([parry(50, 50, { carriedOver: true, full: true })])).toEqual({ parry: -50, 'survival-instinct': -25 });
    expect(await parried([parry(30, 30, { carriedOver: true })])).toEqual({ parry: -30 });
  });

  it('does not count a protection', async () => {
    expect(await parried([parry(50, 50, { type: 'protect' })])).toEqual({ parry: -50 });
  });

  it('needs the talent for the attack the parry comes from, the one with the highest OB', async () => {
    expect(await parried([parry(50, 50)], 'melee-weapon@hafted')).toEqual({ parry: -50 });
    expect(await parried([parry(50, 50)], null)).toEqual({ parry: -50, 'survival-instinct': -25 });
    expect(await parried([parry(50, 50)], 'blade', 'melee-weapon@blade')).toEqual({ parry: -50, 'survival-instinct': -25 });
  });

  it('removes the bonus when the parry is declared again with less OB', async () => {
    const ctx = createCombatPluginContext({
      parry: 50,
      targetTraits: [new ActorRoundTrait('survival-instinct', 1, null)],
      targetAttacks: [meleeAttack('mainHand', 50, 'melee-weapon@blade')],
    });
    ctx.attackPreparation = undefined;
    ctx.attack!.calculated = { rollModifiers: [] } as unknown as ActionAttackCalculated;
    ctx.action.parries = [parry(50, 50)];
    await runPluginHook(CombatSurvivalInstinctPlugin, 'parry', ctx);
    ctx.action.parries = [parry(20, 50)];
    await runPluginHook(CombatSurvivalInstinctPlugin, 'parry', ctx);
    expect(rollModifierValues(ctx)).toEqual({});
  });
});

describe('Frenzy in combat (spec 040, decisions 10, 11 and 13)', () => {
  const context = (options: CombatPluginContextOptions, strengthWeight: number | null = null): CombatContext => {
    const ctx = createCombatPluginContext(options);
    ctx.sourceAttack!.strengthWeight = strengthWeight;
    return ctx;
  };

  it('adds +5 OB per level for each time St is in the attack bonus', async () => {
    const normal = context({ sourceEffects: [frenzy(1)] }, 2);
    await runPluginHook(CombatFrenzyPlugin, 'prepare', normal);
    expect(rollModifierValues(normal)).toEqual({ 'frenzy-strength': 10 });

    const greater = context({ sourceEffects: [frenzy(2)] }, 1);
    await runPluginHook(CombatFrenzyPlugin, 'prepare', greater);
    expect(rollModifierValues(greater)).toEqual({ 'frenzy-strength': 10 });

    const noStrength = context({ sourceEffects: [frenzy(1)] }, 0);
    expect(await runPluginHook(CombatFrenzyPlugin, 'prepare', noStrength)).toBe(false);
  });

  it('counts St twice in melee and once at range when the sheet gives no weight', async () => {
    const melee = context({ sourceEffects: [frenzy(1)] });
    await runPluginHook(CombatFrenzyPlugin, 'prepare', melee);
    expect(rollModifierValues(melee)).toEqual({ 'frenzy-strength': 10 });

    const ranged = context({ attackType: 'ranged', sourceEffects: [frenzy(1)] });
    await runPluginHook(CombatFrenzyPlugin, 'prepare', ranged);
    expect(rollModifierValues(ranged)).toEqual({ 'frenzy-strength': 5 });
  });

  it('gives nothing outside frenzy', async () => {
    expect(await runPluginHook(CombatFrenzyPlugin, 'prepare', context({}, 2))).toBe(false);
  });

  it('makes melee attacks one size larger per level, on top of Heedless Fury', async () => {
    const severity = async (options: CombatPluginContextOptions, style?: ActorRoundActiveStyle) => {
      const ctx = context(options);
      if (style) ctx.sourceActor!.activeStyle = style;
      ctx.attackTableEntry = new AttackTableEntry('7BS', 7, 'S', 'B');
      await runPluginHook(CombatAttackSizePlugin, 'afterAttackRoll', ctx);
      return ctx.attackTableEntry.criticalSeverity;
    };
    expect(await severity({ sourceEffects: [frenzy(1)] })).toBe('C');
    expect(await severity({ sourceEffects: [frenzy(2)] })).toBe('D');
    expect(await severity({ sourceEffects: [frenzy(1)] }, heedlessFury())).toBe('D');
    expect(await severity({ attackType: 'ranged', sourceEffects: [frenzy(1)] })).toBe('B');
  });

  it('leaves out the DB, shield and dodge of a target in frenzy', async () => {
    const options: CombatPluginContextOptions = {
      targetEffects: [frenzy(1)],
      shield: new ActorRoundShield(20, 1, 0),
      defenseMode: new ActorRoundDefenseMode('partial', 'none'),
      situationalModifiers: { targetStatus: ['frenzy'] },
    };
    const ctx = context(options);
    expect(await runPluginHook(CombatDefensiveBonusPlugin, 'prepare', ctx)).toBe(false);
    await runPluginHook(CombatShieldPlugin, 'prepare', ctx);
    expect(await runPluginHook(CombatDodgePlugin, 'prepare', ctx)).toBe(false);
    expect(rollModifierValues(ctx)).toEqual({});

    const calm = context({ ...options, targetEffects: [], situationalModifiers: { targetStatus: [] } });
    await runPluginHook(CombatDefensiveBonusPlugin, 'prepare', calm);
    expect(rollModifierValues(calm)).toEqual({ bd: -25 });
  });
});
