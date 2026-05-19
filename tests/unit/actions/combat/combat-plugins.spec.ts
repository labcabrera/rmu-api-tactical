import { describe, expect, it } from '@jest/globals';
import { ActorRoundShield } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-shield.vo';
import { ValidationError } from '../../../../src/modules/shared/domain/errors';
import {
  CombatCalledShotPlugin,
  CombatHigherGroundPlugin,
  CombatMultipleAttacksPlugin,
  CombatOffHandPlugin,
  CombatPacePlugin,
  CombatPositionalSourcePlugin,
  CombatPositionalTargetPlugin,
  CombatRestrictedQuartersPlugin,
  CombatShieldPlugin,
  CombatSizeDifferencePlugin,
} from '../../../../src/modules/actions/application/services/combat';
import { createCombatPluginContext, getModifier } from './combat-plugin-test.factory';

describe('Combat plugins', () => {
  describe('CombatCalledShotPlugin', () => {
    it('applies the declared called shot penalty', async () => {
      const ctx = createCombatPluginContext({ calledShot: 'head', calledShotPenalty: 30 });

      await CombatCalledShotPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'calledShotPenalty')?.value).toBe(-30);
    });
  });

  describe('CombatHigherGroundPlugin', () => {
    it('adds the higher ground attack modifier', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { higherGround: true } });

      await CombatHigherGroundPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'higherGround')?.value).toBe(10);
    });
  });

  describe('CombatMultipleAttacksPlugin', () => {
    it('applies attack count and additional target penalties from the kata table', async () => {
      const ctx = createCombatPluginContext({ attackNumber: 3, targetsNumber: 2 });

      await CombatMultipleAttacksPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'attackNumber')?.value).toBe(-100);
      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'attackTargets')?.value).toBe(-20);
    });
  });

  describe('CombatOffHandPlugin', () => {
    it('applies the off-hand penalty when the source is not ambidextrous', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { offHand: true } });

      await CombatOffHandPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'offHand')?.value).toBe(-20);
    });

    it('does not apply the off-hand penalty to an ambidextrous source', async () => {
      const ctx = createCombatPluginContext({
        sourceTraits: [{ id: 'ambidextrous' }],
        situationalModifiers: { offHand: true },
      });

      await CombatOffHandPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'offHand')).toBeUndefined();
    });
  });

  describe('CombatPacePlugin', () => {
    it('adds the pace penalty for jog movement', async () => {
      const ctx = createCombatPluginContext({ pace: 'jog' });

      await CombatPacePlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'pace')?.value).toBe(-50);
    });

    it('rejects invalid attack paces', () => {
      const ctx = createCombatPluginContext({ pace: 'sprint' });

      expect(() => CombatPacePlugin.hooks.prepare![0].apply(ctx)).toThrow(ValidationError);
    });
  });

  describe('CombatPositionalSourcePlugin', () => {
    it('adds the positional source penalty for rear attacks', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { positionalSource: 'to_rear' } });

      await CombatPositionalSourcePlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'positionalSource')?.value).toBe(-70);
    });
  });

  describe('CombatPositionalTargetPlugin', () => {
    it('adds the positional target bonus for flank attacks', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { positionalTarget: 'flank' } });

      await CombatPositionalTargetPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'positionalTarget')?.value).toBe(15);
    });

    it('does not add a positional target modifier for none', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { positionalTarget: 'none' } });

      await CombatPositionalTargetPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'positionalTarget')).toBeUndefined();
    });
  });

  describe('CombatRestrictedQuartersPlugin', () => {
    it('adds the restricted quarters penalty for cramped space', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { restrictedQuarters: 'cramped' } });

      await CombatRestrictedQuartersPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'restrictedQuarters')?.value).toBe(-50);
    });
  });

  describe('CombatShieldPlugin', () => {
    it('adds the defender shield db penalty when blocks remain', async () => {
      const ctx = createCombatPluginContext({ shield: new ActorRoundShield(25, 2, 0) });

      await CombatShieldPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'shield')?.value).toBe(-25);
    });
  });

  describe('CombatSizeDifferencePlugin', () => {
    it('adds db and critical modifiers from the size difference', async () => {
      const ctx = createCombatPluginContext({ sourceSize: 3, targetSize: 1 });

      await CombatSizeDifferencePlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'sizeDifferenceDB')?.value).toBe(-10);
      expect(getModifier(ctx.attackPreparation!.modifiers.criticalModifiers, 'sizeDifference')?.value).toBe(2);
    });
  });
});
