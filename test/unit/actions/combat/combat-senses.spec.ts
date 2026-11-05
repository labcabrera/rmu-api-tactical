import { describe, expect, it } from 'vitest';
import {
  CombatLightSensitivityPlugin,
  CombatTextEffectsPlugin,
} from '../../../../src/modules/actions/application/services/combat/index.js';
import { ActorRoundTrait } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import type { LightType } from '../../../../src/modules/actions/domain/value-objects/light-type.vo.js';
import { createCombatPluginContext, getModifier, rollModifierValues, runPluginHook } from './combat-plugin-test.factory.js';

/* Workspace spec 076, §3.3: the senses in combat (invented actors). */

const trait = (traitId: string, tier = 1) => new ActorRoundTrait(traitId, tier, null);
const BLINDED_HOOK = 1;

const blindedAttack = async (traits: ActorRoundTrait[]) => {
  const ctx = createCombatPluginContext({ sourceTraits: traits, situationalModifiers: { sourceStatus: ['blinded'] } });
  await runPluginHook(CombatTextEffectsPlugin, 'prepare', ctx, BLINDED_HOOK);
  return ctx;
};

const lightAttack = async (light: LightType | null | undefined, traits: ActorRoundTrait[]) => {
  const ctx = createCombatPluginContext({ sourceTraits: traits });
  ctx.light = light;
  const applied = await runPluginHook(CombatLightSensitivityPlugin, 'prepare', ctx);
  return { ctx, applied };
};

describe('Extra Sense against an unseen target', () => {
  it('a blinded attacker with Extra Sense IV attacks at -25', async () => {
    const ctx = await blindedAttack([trait('extra-sense', 4)]);
    expect(rollModifierValues(ctx).blinded).toBe(-25);
    expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'blinded')!.params).toEqual({ extraSense: 4 });
  });

  it('-50 at tier III, nothing at tier V, and -100 below tier III', async () => {
    expect(rollModifierValues(await blindedAttack([trait('extra-sense', 3)])).blinded).toBe(-50);
    expect(rollModifierValues(await blindedAttack([trait('extra-sense', 5)])).blinded).toBeUndefined();
    expect(rollModifierValues(await blindedAttack([trait('extra-sense', 2)])).blinded).toBe(-100);
    expect(rollModifierValues(await blindedAttack([])).blinded).toBe(-100);
  });
});

describe('CombatLightSensitivityPlugin', () => {
  it('Light Sensitivity II in the bright ambient light of the game: -50 OB', async () => {
    const { ctx } = await lightAttack('no_shadows', [trait('light-sensitivity', 2)]);
    const modifier = getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'light-sensitivity')!;
    expect(modifier).toMatchObject({ value: -50, group: 'offense', source: 'light-sensitivity', params: { light: 'no_shadows', tier: 2 } });
  });

  it('less in the shade, and nothing without ambient light or without the talent', async () => {
    expect(rollModifierValues((await lightAttack('light_shadows', [trait('light-sensitivity', 2)])).ctx)['light-sensitivity']).toBe(-25);
    expect((await lightAttack('medium_shadows', [trait('light-sensitivity', 2)])).applied).toBe(false);
    expect((await lightAttack(null, [trait('light-sensitivity', 3)])).applied).toBe(false);
    expect((await lightAttack(undefined, [trait('light-sensitivity', 3)])).applied).toBe(false);
    expect((await lightAttack('no_shadows', [])).applied).toBe(false);
  });
});
