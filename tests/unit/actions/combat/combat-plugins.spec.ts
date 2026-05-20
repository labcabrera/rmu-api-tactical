import { describe, expect, it } from '@jest/globals';
import { ActorRoundShield } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-shield.vo';
import { ActionAttackCalculated } from '../../../../src/modules/actions/domain/value-objects/action-attack-calculated.vo';
import { ValidationError } from '../../../../src/modules/shared/domain/errors';
import {
  CombatActionPointsPlugin,
  CombatBreakagePlugin,
  CombatCalledShotPlugin,
  CombatCoverPlugin,
  CombatHigherGroundPlugin,
  CombatMultipleAttacksPlugin,
  CombatPacePlugin,
  CombatPositionalSourcePlugin,
  CombatPositionalTargetPlugin,
  CombatPronePlugin,
  CombatRestrictedQuartersPlugin,
  CombatShieldPlugin,
  CombatSizeDifferencePlugin,
  CombatStunPlugin,
  CombatSurprisedPlugin,
} from '../../../../src/modules/actions/application/services/combat';
import { createCombatPluginContext, getModifier } from './combat-plugin-test.factory';

describe('Combat plugins', () => {
  describe('CombatActionPointsPlugin', () => {
    it('applies -25 for each missing melee action point', async () => {
      const ctx = createCombatPluginContext({ attackType: 'melee', actionPoints: 2 });

      await CombatActionPointsPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'action-points')?.value).toBe(-50);
    });

    it('applies -25 for each missing ranged action point', async () => {
      const ctx = createCombatPluginContext({ attackType: 'ranged', actionPoints: 2 });

      await CombatActionPointsPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'action-points')?.value).toBe(-25);
    });

    it('does not apply action point penalties to free actions', async () => {
      const ctx = createCombatPluginContext({ attackType: 'melee', actionPoints: 1, freeAction: true });

      await CombatActionPointsPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'action-points')).toBeUndefined();
    });
  });

  describe('CombatBreakagePlugin', () => {
    it.each([33, 77])('marks breakage roll when the attack roll is %i', async attackRoll => {
      const ctx = createCombatPluginContext();
      ctx.attackRoll = attackRoll;
      ctx.attack!.calculated = new ActionAttackCalculated([], 0, undefined, false);

      await CombatBreakagePlugin.hooks.beforeAttackRoll![0].apply(ctx);

      expect(ctx.attack!.calculated.breakageRoll).toBe(true);
    });

    it('does not mark breakage roll for other attack rolls', async () => {
      const ctx = createCombatPluginContext();
      ctx.attackRoll = 34;
      ctx.attack!.calculated = new ActionAttackCalculated([], 0, undefined, false);

      await CombatBreakagePlugin.hooks.beforeAttackRoll![0].apply(ctx);

      expect(ctx.attack!.calculated.breakageRoll).toBeUndefined();
    });
  });

  describe('CombatCalledShotPlugin', () => {
    it('applies the declared called shot penalty', async () => {
      const ctx = createCombatPluginContext({ calledShot: 'head', calledShotPenalty: 30 });

      await CombatCalledShotPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'called-shot')?.value).toBe(30);
    });
  });

  describe('CombatCoverPlugin', () => {
    it('adds the soft cover penalty for melee attacks', async () => {
      const ctx = createCombatPluginContext({ attackType: 'melee', situationalModifiers: { cover: 'soft_half' } });

      await CombatCoverPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'cover')?.value).toBe(-20);
    });

    it('adds the ranged cover penalty using the ranged-only table', async () => {
      const ctx = createCombatPluginContext({ attackType: 'ranged', situationalModifiers: { cover: 'soft_half' } });

      await CombatCoverPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'cover')?.value).toBe(-40);
    });

    it('doubles the cover penalty for hard cover', async () => {
      const ctx = createCombatPluginContext({ attackType: 'ranged', situationalModifiers: { cover: 'hard_full' } });

      await CombatCoverPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'cover')?.value).toBe(-200);
    });
  });

  describe('CombatHigherGroundPlugin', () => {
    it('adds the higher ground attack modifier', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { higherGround: true } });

      await CombatHigherGroundPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'higher-ground')?.value).toBe(10);
    });
  });

  describe('CombatMultipleAttacksPlugin', () => {
    it('applies attack count and additional target penalties from the kata table', async () => {
      const ctx = createCombatPluginContext({ attackNumber: 3, targetsNumber: 2 });

      await CombatMultipleAttacksPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'attack-number')?.value).toBe(-100);
      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'target-number')?.value).toBe(-20);
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

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'positional-source')?.value).toBe(-70);
    });
  });

  describe('CombatPositionalTargetPlugin', () => {
    it('adds the positional target bonus for flank attacks', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { positionalTarget: 'flank' } });

      await CombatPositionalTargetPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'positional-target')?.value).toBe(15);
    });

    it('does not add a positional target modifier for none', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { positionalTarget: 'none' } });

      await CombatPositionalTargetPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'positional-target')).toBeUndefined();
    });
  });

  describe('CombatRestrictedQuartersPlugin', () => {
    it('adds the restricted quarters penalty for cramped space', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { restrictedQuarters: 'cramped' } });

      await CombatRestrictedQuartersPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'restricted-quarters')?.value).toBe(-50);
    });
  });

  describe('CombatPronePlugin', () => {
    it('adds the prone source penalty when the attacker is prone', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { sourceStatus: ['prone'] } });

      await CombatPronePlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'prone-source')?.value).toBe(-50);
    });

    it('adds the prone target bonus for melee attacks', async () => {
      const ctx = createCombatPluginContext({ attackType: 'melee', situationalModifiers: { targetStatus: ['prone'] } });

      await CombatPronePlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'prone-target')?.value).toBe(30);
    });

    it('adds the prone target penalty for ranged attacks', async () => {
      const ctx = createCombatPluginContext({ attackType: 'ranged', situationalModifiers: { targetStatus: ['prone'] } });

      await CombatPronePlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'prone-target')?.value).toBe(-30);
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

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'size-db')?.value).toBe(-10);
      expect(getModifier(ctx.attackPreparation!.modifiers.criticalModifiers, 'size-difference')?.value).toBe(2);
    });
  });

  describe('CombatStunPlugin', () => {
    it('adds the stunned foe bonus when the target is stunned and not surprised', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { targetStatus: ['stunned'] } });

      await CombatStunPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'stunned-foe')?.value).toBe(20);
    });

    it('does not add the stunned foe bonus when the target is surprised', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { targetStatus: ['stunned', 'surprised'] } });

      await CombatStunPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'stunned-foe')).toBeUndefined();
    });
  });

  describe('CombatSurprisedPlugin', () => {
    it('adds the surprised foe bonus when the target is surprised', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { targetStatus: ['surprised'] } });

      await CombatSurprisedPlugin.hooks.prepare![0].apply(ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'surprised-foe')?.value).toBe(25);
    });
  });
});
