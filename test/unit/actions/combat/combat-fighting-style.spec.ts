import { describe, expect, it } from 'vitest';
import {
  CombatAttackSizePlugin,
  CombatCalledShotPlugin,
  CombatFightingStyleSourcePlugin,
  CombatFightingStyleTargetPlugin,
  CombatParryPlugin,
} from '../../../../src/modules/actions/application/services/combat/index.js';
import { ActionAttackCalculated } from '../../../../src/modules/actions/domain/value-objects/action-attack-calculated.vo.js';
import { AttackTableEntry } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { KeyValueModifier } from '../../../../src/modules/actions/domain/value-objects/key-value-modifier.vo.js';
import type { ActorRoundActiveStyle } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-fighting-style.vo.js';
import { ActorRoundTrait } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import {
  type CombatPluginContextOptions,
  createCombatPluginContext,
  rollModifierValues,
  runPluginHook,
} from './combat-plugin-test.factory.js';

// Workspace spec 032: made-up styles; the abilities are the ones the plugins read.
const style = (abilities: string[], overrides: Partial<ActorRoundActiveStyle> = {}): ActorRoundActiveStyle => ({
  skillId: 'combat-styles',
  styleId: 'test-style',
  met: true,
  attackNames: null,
  freeRanksBonus: 0,
  abilities: abilities.map(abilityId => ({ abilityId, times: 1, met: true, attackNames: null })),
  warnings: [],
  options: [],
  ...overrides,
});

const context = (options: CombatPluginContextOptions, source?: ActorRoundActiveStyle, target?: ActorRoundActiveStyle) => {
  const ctx = createCombatPluginContext(options);
  ctx.sourceActor!.activeStyle = source ?? null;
  ctx.targetActor!.activeStyle = target ?? null;
  return ctx;
};

const prepareSource = async (options: CombatPluginContextOptions, source: ActorRoundActiveStyle, extra: KeyValueModifier[] = []) => {
  const ctx = context(options, source);
  ctx.attackPreparation!.modifiers.rollModifiers.push(...extra);
  await runPluginHook(CombatFightingStyleSourcePlugin, 'prepare', ctx);
  return ctx;
};

describe('Combat fighting styles (spec 032)', () => {
  it('adds the OB of the free ranks only to the attacks the style works with', async () => {
    expect(rollModifierValues(await prepareSource({}, style([], { freeRanksBonus: 6 })))).toEqual({ 'style-free-ranks': 6 });
    expect(rollModifierValues(await prepareSource({}, style([], { freeRanksBonus: 6, attackNames: ['mainHand'] })))).toEqual({});
    expect(rollModifierValues(await prepareSource({}, style([], { freeRanksBonus: 6, met: false })))).toEqual({});
  });

  it('gives Point-Blank Shot within 20 feet and halves the cover with Trick Shot', async () => {
    const ranged: CombatPluginContextOptions = { attackType: 'ranged', range: 15 };
    const cover = [new KeyValueModifier('cover', -40)];
    expect(rollModifierValues(await prepareSource(ranged, style(['point-blank-shot', 'trick-shot']), cover))).toEqual({
      cover: -40,
      'point-blank-shot': 20,
      'trick-shot': 20,
    });
    expect(rollModifierValues(await prepareSource({ ...ranged, range: 30 }, style(['point-blank-shot'])))).toEqual({});
  });

  it('lowers the called shot penalty of ranged attacks with Precise Target', async () => {
    const ctx = await prepareSource({ attackType: 'ranged', range: 50, calledShot: 'head' }, style(['precise-target']));
    await runPluginHook(CombatCalledShotPlugin, 'prepare', ctx);
    expect(rollModifierValues(ctx)).toEqual({ 'called-shot': -10 });
  });

  it('halves the shield DB with Evade Shield', async () => {
    const shield = [new KeyValueModifier('shield', -25), new KeyValueModifier('shield-block', -10)];
    expect(rollModifierValues(await prepareSource({}, style(['evade-shield']), shield))).toEqual({
      shield: -25,
      'shield-block': -10,
      'evade-shield': 17,
    });
  });

  it('cancels the off-hand penalty of a dagger, but not with Ambidextrous', async () => {
    const offHand = (traits: ActorRoundTrait[] = []) => {
      const ctx = context({ weaponCategory: 'dagger', sourceTraits: traits }, style(['off-hand-dagger']));
      ctx.sourceAttack!.attackName = 'offHand';
      ctx.attack!.attackName = 'offHand';
      return ctx;
    };
    const plain = offHand();
    await runPluginHook(CombatFightingStyleSourcePlugin, 'prepare', plain);
    expect(rollModifierValues(plain)).toEqual({ 'off-hand-dagger': 20 });
    const ambidextrous = offHand([new ActorRoundTrait('ambidextrous', 1, null)]);
    await runPluginHook(CombatFightingStyleSourcePlugin, 'prepare', ambidextrous);
    expect(rollModifierValues(ambidextrous)).toEqual({});
  });

  it('trades OB for the critical roll with Killing Strike only when declared, and opens the defense', async () => {
    const declared = style(['killing-strike'], { options: ['killing-strike'] });
    const ctx = await prepareSource({}, declared);
    expect(rollModifierValues(ctx)).toEqual({ 'killing-strike': -10 });
    expect(ctx.attackPreparation!.modifiers.criticalModifiers.map(m => [m.key, m.value])).toEqual([['killing-strike', 5]]);
    expect(rollModifierValues(await prepareSource({}, style(['killing-strike'])))).toEqual({});

    const against = context({}, undefined, declared);
    await runPluginHook(CombatFightingStyleTargetPlugin, 'prepare', against);
    expect(rollModifierValues(against)).toEqual({ 'killing-strike-target': 10 });
  });

  it('makes the target easier to hit with Heedless Fury, and its own melee attacks one size larger', async () => {
    const against = context({}, undefined, style(['heedless-fury']));
    await runPluginHook(CombatFightingStyleTargetPlugin, 'prepare', against);
    expect(rollModifierValues(against)).toEqual({ 'heedless-fury': 20 });

    const own = context({}, style(['heedless-fury']));
    own.attackTableEntry = { criticalSeverity: 'B' } as AttackTableEntry;
    await runPluginHook(CombatAttackSizePlugin, 'afterAttackRoll', own);
    expect(own.attackTableEntry.criticalSeverity).toBe('C');
  });

  it('makes each parry point worth more with Improved Parry, and lifts the unarmed restriction with Unarmed Parry', async () => {
    const parried = async (abilities: string[], restrictedParry = false) => {
      const ctx = context({ parry: 20, modifiers: { restrictedParry } }, undefined, style(abilities));
      ctx.attackPreparation = undefined;
      ctx.attack!.calculated = { rollModifiers: [] } as unknown as ActionAttackCalculated;
      await runPluginHook(CombatParryPlugin, 'parry', ctx);
      await runPluginHook(CombatFightingStyleTargetPlugin, 'parry', ctx);
      return rollModifierValues(ctx);
    };
    expect(await parried(['improved-parry'])).toEqual({ parry: -20, 'improved-parry': -10 });
    expect(await parried(['improved-parry'], true)).toEqual({ 'restricted-parry': -10 });
    expect(await parried(['unarmed-parry'], true)).toEqual({ 'restricted-parry': -10, 'unarmed-parry': -10 });
  });
});
