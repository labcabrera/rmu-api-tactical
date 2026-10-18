import { describe, expect, it } from '@jest/globals';
import { ActorRoundShield } from '../../../../src/modules/actor-rounds/domain/value-objets/actor-round-shield.vo';
import { ActionAttackCalculated } from '../../../../src/modules/actions/domain/value-objects/action-attack-calculated.vo';
import { AttackTableEntry } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo';
import { KeyValueModifier } from '../../../../src/modules/actions/domain/value-objects/key-value-modifier.vo';
import { UnprocessableEntityError, ValidationError } from '../../../../src/modules/shared/domain/errors';
import {
  CombatActorPenaltiesPlugin,
  COMBAT_PLUGIN_LIST,
  CombatAbsoluteHitPlugin,
  CombatActionPointsPlugin,
  CombatAttackSizePlugin,
  CombatBreakagePlugin,
  CombatCalledShotPlugin,
  CombatCoverPlugin,
  CombatCriticalAdjustmentPlugin,
  CombatCriticalExpansionPlugin,
  CombatCustomBonusPlugin,
  CombatDefensiveBonusPlugin,
  CombatGameLethalityPlugin,
  CombatHigherGroundPlugin,
  CombatLocationArmorPlugin,
  CombatMultipleAttacksPlugin,
  CombatOffensiveBonusPlugin,
  CombatPacePlugin,
  CombatParryPlugin,
  CombatPositionalSourcePlugin,
  CombatPositionalTargetPlugin,
  CombatProneSourcePlugin,
  CombatProneTargetPlugin,
  CombatRangeInMeleePlugin,
  CombatRangePlugin,
  CombatRestrictedQuartersPlugin,
  CombatShieldPlugin,
  CombatSizeDifferencePlugin,
  CombatStunPlugin,
  CombatSurprisedPlugin,
} from '../../../../src/modules/actions/application/services/combat';
import { CombatContext } from '../../../../src/modules/actions/application/services/combat/combat-context';
import { createCombatPluginContext, getModifier, rollModifierValues, runPluginHook } from './combat-plugin-test.factory';

const prepare = async (plugin: Parameters<typeof runPluginHook>[0], ctx: CombatContext) => {
  const applied = await runPluginHook(plugin, 'prepare', ctx);
  return { applied, modifiers: rollModifierValues(ctx) };
};

const skill = (skillId: string, bonus: number) => [{ skillId, bonus }];

/** A context after the prepare phase: the attack holds the calculated modifiers and no preparation. */
const preparedContext = (...args: Parameters<typeof createCombatPluginContext>): CombatContext => {
  const ctx = createCombatPluginContext(...args);
  ctx.attack!.calculated = new ActionAttackCalculated([new KeyValueModifier('bo', 75)], 75, undefined, false, undefined, []);
  ctx.attackPreparation = undefined;
  return ctx;
};

describe('Combat plugins', () => {
  it('registers every plugin once, with a kebab-case id', () => {
    const ids = COMBAT_PLUGIN_LIST.map(plugin => plugin.id);

    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach(id => expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/));
  });

  it('skips every prepare hook outside the prepare phase', async () => {
    const ctx = preparedContext({ attackNumber: 2, pace: 'run', situationalModifiers: { cover: 'soft_full' } });

    for (const plugin of COMBAT_PLUGIN_LIST.filter(p => p.hooks.prepare)) {
      expect(await runPluginHook(plugin, 'prepare', ctx)).toBe(false);
    }
  });

  describe('offensive-bonus', () => {
    it('adds the OB used, stamped with the plugin', async () => {
      const ctx = createCombatPluginContext({ bo: 60 });

      await prepare(CombatOffensiveBonusPlugin, ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'bo')).toMatchObject({
        value: 60,
        source: 'offensive-bonus',
        group: 'offense',
      });
    });

    it('adds nothing for an OB of 0', async () => {
      expect((await prepare(CombatOffensiveBonusPlugin, createCombatPluginContext({ bo: 0 }))).modifiers).toEqual({});
    });
  });

  describe('defensive-bonus', () => {
    it('subtracts the target DB', async () => {
      expect((await prepare(CombatDefensiveBonusPlugin, createCombatPluginContext({ defense: { bd: 30 } }))).modifiers).toEqual({
        bd: -30,
      });
    });

    it('is skipped when the DB is disabled', async () => {
      const result = await prepare(CombatDefensiveBonusPlugin, createCombatPluginContext({ situationalModifiers: { disabledDB: true } }));

      expect(result.applied).toBe(false);
      expect(result.modifiers).toEqual({});
    });
  });

  describe('shield', () => {
    it('subtracts the shield DB while blocks remain', async () => {
      const ctx = createCombatPluginContext({ shield: new ActorRoundShield(25, 2, 0) });

      expect((await prepare(CombatShieldPlugin, ctx)).modifiers).toEqual({ shield: -25 });
    });

    it('is skipped with no blocks left, no shield or the shield disabled', async () => {
      expect((await prepare(CombatShieldPlugin, createCombatPluginContext({ shield: new ActorRoundShield(25, 2, 2) }))).applied).toBe(
        false,
      );
      expect((await prepare(CombatShieldPlugin, createCombatPluginContext())).applied).toBe(false);
      const disabled = createCombatPluginContext({
        shield: new ActorRoundShield(25, 2, 0),
        situationalModifiers: { disabledShield: true },
      });
      expect((await prepare(CombatShieldPlugin, disabled)).applied).toBe(false);
    });
  });

  describe('range', () => {
    const ranges = [
      { from: 0, to: 10, bonus: 0 },
      { from: 11, to: 50, bonus: -25 },
    ];

    it('adds the range penalty of ranged attacks', async () => {
      const ctx = createCombatPluginContext({ attackType: 'ranged', range: 30, ranges });

      expect((await prepare(CombatRangePlugin, ctx)).modifiers).toEqual({ 'range-penalty': -25 });
    });

    it('rejects a range out of the weapon ranges', async () => {
      const ctx = createCombatPluginContext({ attackType: 'ranged', range: 80, ranges });

      await expect(prepare(CombatRangePlugin, ctx)).rejects.toThrow(ValidationError);
    });

    it('is skipped for melee attacks or without a range', async () => {
      expect((await prepare(CombatRangePlugin, createCombatPluginContext({ attackType: 'melee', range: 30, ranges }))).applied).toBe(false);
      expect((await prepare(CombatRangePlugin, createCombatPluginContext({ attackType: 'ranged', ranges }))).applied).toBe(false);
    });
  });

  describe('game-lethality', () => {
    it('adds a positive lethality', async () => {
      expect((await prepare(CombatGameLethalityPlugin, createCombatPluginContext({ gameLethality: 10 }))).modifiers).toEqual({
        'game-lethality': 10,
      });
    });

    it('ignores a negative lethality, as the Python calculator', async () => {
      expect((await prepare(CombatGameLethalityPlugin, createCombatPluginContext({ gameLethality: -10 }))).applied).toBe(false);
    });
  });

  describe('custom-bonus', () => {
    it('adds the declared custom bonus', async () => {
      expect((await prepare(CombatCustomBonusPlugin, createCombatPluginContext({ customBonus: -15 }))).modifiers).toEqual({
        'custom-bonus': -15,
      });
    });
  });

  describe('action-points', () => {
    it('applies -25 for each missing melee action point', async () => {
      expect((await prepare(CombatActionPointsPlugin, createCombatPluginContext({ actionPoints: 2 }))).modifiers).toEqual({
        'action-points': -50,
      });
    });

    it('requires 3 action points for ranged attacks', async () => {
      const ctx = createCombatPluginContext({ attackType: 'ranged', actionPoints: 2 });

      expect((await prepare(CombatActionPointsPlugin, ctx)).modifiers).toEqual({ 'action-points': -25 });
    });

    it('clamps at 0 instead of giving a bonus for extra points (intended deviation)', async () => {
      const ctx = createCombatPluginContext({ attackType: 'ranged', actionPoints: 4 });

      expect((await prepare(CombatActionPointsPlugin, ctx)).modifiers).toEqual({});
    });

    it('is skipped for free actions', async () => {
      expect((await prepare(CombatActionPointsPlugin, createCombatPluginContext({ actionPoints: 1, freeAction: true }))).applied).toBe(
        false,
      );
    });
  });

  describe('pace', () => {
    it('adds the pace penalty with the footwork offset for melee attacks', async () => {
      const ctx = createCombatPluginContext({ pace: 'jog', sourceSkills: skill('footwork', 20) });

      expect((await prepare(CombatPacePlugin, ctx)).modifiers).toEqual({ 'pace-penalty': -50, 'pace-penalty-skill': 20 });
    });

    it('ignores footwork for ranged attacks', async () => {
      const ctx = createCombatPluginContext({ attackType: 'ranged', pace: 'walk', sourceSkills: skill('footwork', 20) });

      expect((await prepare(CombatPacePlugin, ctx)).modifiers).toEqual({ 'pace-penalty': -25 });
    });

    it('is skipped when creeping or without pace', async () => {
      expect((await prepare(CombatPacePlugin, createCombatPluginContext({ pace: 'creep' }))).applied).toBe(false);
      expect((await prepare(CombatPacePlugin, createCombatPluginContext())).applied).toBe(false);
    });

    it('rejects sprint and dash', async () => {
      await expect(prepare(CombatPacePlugin, createCombatPluginContext({ pace: 'sprint' }))).rejects.toThrow(ValidationError);
    });
  });

  describe('restricted-quarters', () => {
    it('adds the penalty and the skill offset', async () => {
      const ctx = createCombatPluginContext({
        situationalModifiers: { restrictedQuarters: 'cramped' },
        sourceSkills: skill('restricted-quarters', 30),
      });

      expect((await prepare(CombatRestrictedQuartersPlugin, ctx)).modifiers).toEqual({
        'restricted-quarters': -50,
        'restricted-quarters-skill': 30,
      });
    });

    it('caps the skill at the penalty', async () => {
      const ctx = createCombatPluginContext({
        situationalModifiers: { restrictedQuarters: 'close' },
        sourceSkills: skill('restricted-quarters', 80),
      });

      expect((await prepare(CombatRestrictedQuartersPlugin, ctx)).modifiers).toEqual({
        'restricted-quarters': -25,
        'restricted-quarters-skill': 25,
      });
    });

    it('is skipped without restricted quarters', async () => {
      expect((await prepare(CombatRestrictedQuartersPlugin, createCombatPluginContext())).applied).toBe(false);
    });
  });

  describe('prone-source', () => {
    it('applies -50 when the attacker is prone, as an effect or declared', async () => {
      const effect = createCombatPluginContext({ situationalModifiers: { sourceStatus: ['prone'] } });
      const declared = createCombatPluginContext({ modifiers: { proneSource: true } });

      expect((await prepare(CombatProneSourcePlugin, effect)).modifiers).toEqual({ 'prone-source': -50 });
      expect((await prepare(CombatProneSourcePlugin, declared)).modifiers).toEqual({ 'prone-source': -50 });
      expect(CombatProneSourcePlugin.group).toBe('offense');
    });

    it('is skipped when the attacker is not prone', async () => {
      expect((await prepare(CombatProneSourcePlugin, createCombatPluginContext())).applied).toBe(false);
    });
  });

  describe('prone-target', () => {
    it('adds +30 for melee attacks', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { targetStatus: ['prone'] } });

      expect((await prepare(CombatProneTargetPlugin, ctx)).modifiers).toEqual({ 'prone-target': 30 });
      expect(CombatProneTargetPlugin.group).toBe('defense');
    });

    it.each(['ranged', 'thrown'] as const)('adds -30 for %s attacks', async attackType => {
      const ctx = createCombatPluginContext({ attackType, modifiers: { proneTarget: true } });

      expect((await prepare(CombatProneTargetPlugin, ctx)).modifiers).toEqual({ 'prone-target': -30 });
    });
  });

  describe('stunned-target', () => {
    it('adds +20 when the target is stunned, as an effect or declared', async () => {
      const effect = createCombatPluginContext({ situationalModifiers: { targetStatus: ['stunned'] } });
      const declared = createCombatPluginContext({ modifiers: { stunnedFoe: true } });

      expect((await prepare(CombatStunPlugin, effect)).modifiers).toEqual({ 'stunned-target': 20 });
      expect((await prepare(CombatStunPlugin, declared)).modifiers).toEqual({ 'stunned-target': 20 });
    });

    it('also applies when the target is surprised, as the Python calculator', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { targetStatus: ['stunned', 'surprised'] } });

      await prepare(CombatStunPlugin, ctx);
      await prepare(CombatSurprisedPlugin, ctx);

      expect(rollModifierValues(ctx)).toEqual({ 'stunned-target': 20, 'surprised-target': 25 });
    });

    it('is skipped when the target is not stunned', async () => {
      expect((await prepare(CombatStunPlugin, createCombatPluginContext())).applied).toBe(false);
    });
  });

  describe('surprised-target', () => {
    it('adds +25 when the target is surprised', async () => {
      const ctx = createCombatPluginContext({ modifiers: { surprisedFoe: true } });

      expect((await prepare(CombatSurprisedPlugin, ctx)).modifiers).toEqual({ 'surprised-target': 25 });
    });

    it('is skipped when the target is not surprised', async () => {
      expect((await prepare(CombatSurprisedPlugin, createCombatPluginContext())).applied).toBe(false);
    });
  });

  describe('positional-source', () => {
    it('adds the rear penalty and the reverse-strike offset for melee attacks', async () => {
      const ctx = createCombatPluginContext({
        situationalModifiers: { positionalSource: 'to_rear' },
        sourceSkills: skill('reverse-strike', 40),
      });

      expect((await prepare(CombatPositionalSourcePlugin, ctx)).modifiers).toEqual({
        'positional-source': -70,
        'positional-source-skill': 40,
      });
    });

    it.each(['ranged', 'thrown'] as const)('is skipped for %s attacks', async attackType => {
      const ctx = createCombatPluginContext({ attackType, situationalModifiers: { positionalSource: 'to_flank' } });

      expect((await prepare(CombatPositionalSourcePlugin, ctx)).applied).toBe(false);
    });
  });

  describe('positional-target', () => {
    it('adds the flank bonus for melee attacks', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { positionalTarget: 'flank' } });

      expect((await prepare(CombatPositionalTargetPlugin, ctx)).modifiers).toEqual({ 'positional-target': 15 });
    });

    it('is skipped for ranged attacks and for none', async () => {
      const ranged = createCombatPluginContext({ attackType: 'ranged', situationalModifiers: { positionalTarget: 'rear' } });

      expect((await prepare(CombatPositionalTargetPlugin, ranged)).applied).toBe(false);
      expect((await prepare(CombatPositionalTargetPlugin, createCombatPluginContext())).applied).toBe(false);
    });
  });

  describe('cover', () => {
    it('adds the soft cover penalty for melee attacks', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { cover: 'soft_half' } });

      expect((await prepare(CombatCoverPlugin, ctx)).modifiers).toEqual({ cover: -20 });
    });

    it.each(['ranged', 'thrown'] as const)('uses the ranged table for %s attacks', async attackType => {
      const ctx = createCombatPluginContext({ attackType, situationalModifiers: { cover: 'soft_half' } });

      expect((await prepare(CombatCoverPlugin, ctx)).modifiers).toEqual({ cover: -40 });
    });

    it('doubles the penalty for hard cover', async () => {
      const ctx = createCombatPluginContext({ attackType: 'ranged', situationalModifiers: { cover: 'hard_full' } });

      expect((await prepare(CombatCoverPlugin, ctx)).modifiers).toEqual({ cover: -200 });
    });

    it('is skipped without cover', async () => {
      expect((await prepare(CombatCoverPlugin, createCombatPluginContext())).applied).toBe(false);
    });
  });

  describe('range-in-melee', () => {
    it('applies -20 to a ranged attack while the attacker is in melee', async () => {
      const declared = createCombatPluginContext({ attackType: 'ranged', modifiers: { attackerInMelee: true } });
      const status = createCombatPluginContext({ attackType: 'thrown', situationalModifiers: { sourceStatus: ['melee'] } });

      expect((await prepare(CombatRangeInMeleePlugin, declared)).modifiers).toEqual({ 'range-in-melee': -20 });
      expect((await prepare(CombatRangeInMeleePlugin, status)).modifiers).toEqual({ 'range-in-melee': -20 });
    });

    it('is skipped for melee attacks or out of melee', async () => {
      expect((await prepare(CombatRangeInMeleePlugin, createCombatPluginContext({ modifiers: { attackerInMelee: true } }))).applied).toBe(
        false,
      );
      expect((await prepare(CombatRangeInMeleePlugin, createCombatPluginContext({ attackType: 'ranged' }))).applied).toBe(false);
    });
  });

  describe('actor-penalties', () => {
    it("adds the attacker's penalties, one entry per source, stamped with the plugin", async () => {
      const ctx = createCombatPluginContext({
        sourcePenalties: [
          { source: 'hp', value: -75 },
          { source: 'critical', value: -10 },
          { source: 'critical', value: -5 },
        ],
      });

      expect((await prepare(CombatActorPenaltiesPlugin, ctx)).modifiers).toEqual({ 'penalty-hp': -75, 'penalty-critical': -15 });
      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'penalty-hp')).toMatchObject({
        group: 'offense',
        source: 'actor-penalties',
      });
    });

    it('is skipped without penalties or with only zero ones', async () => {
      const zero = createCombatPluginContext({ sourcePenalties: [{ source: 'stunned', value: 0 }] });

      expect((await prepare(CombatActorPenaltiesPlugin, createCombatPluginContext())).applied).toBe(false);
      expect((await prepare(CombatActorPenaltiesPlugin, zero)).applied).toBe(false);
    });
  });

  describe('size-difference', () => {
    it('subtracts 5 per size when the attacker is larger, stamped with the plugin', async () => {
      const ctx = createCombatPluginContext({ sourceSize: 3, targetSize: 1 });

      await prepare(CombatSizeDifferencePlugin, ctx);

      expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'size-difference')).toMatchObject({
        value: -10,
        source: 'size-difference',
      });
      expect(ctx.attackPreparation!.modifiers.criticalModifiers).toEqual([]);
    });

    it('is skipped when the attacker is smaller', async () => {
      expect((await prepare(CombatSizeDifferencePlugin, createCombatPluginContext({ sourceSize: 0, targetSize: 2 }))).applied).toBe(false);
    });

    it('is skipped for the same size', async () => {
      expect((await prepare(CombatSizeDifferencePlugin, createCombatPluginContext())).applied).toBe(false);
    });
  });

  describe('called-shot', () => {
    it('applies -25 when no penalty is given, with the skill offset', async () => {
      const ctx = createCombatPluginContext({ calledShot: 'head', sourceSkills: skill('called-shot', 10) });

      expect((await prepare(CombatCalledShotPlugin, ctx)).modifiers).toEqual({ 'called-shot': -25, 'called-shot-skill': 10 });
    });

    it('applies the declared penalty', async () => {
      const ctx = createCombatPluginContext({ calledShot: 'legs', calledShotPenalty: -40 });

      expect((await prepare(CombatCalledShotPlugin, ctx)).modifiers).toEqual({ 'called-shot': -40 });
    });

    it('is skipped without a called shot', async () => {
      expect((await prepare(CombatCalledShotPlugin, createCombatPluginContext())).applied).toBe(false);
    });
  });

  describe('multiple-attacks', () => {
    it('penalises the number of attacks and of targets', async () => {
      const ctx = createCombatPluginContext({ attackNumber: 3, targetsNumber: 2 });

      expect((await prepare(CombatMultipleAttacksPlugin, ctx)).modifiers).toEqual({ 'attack-number': -100, 'attack-targets': -20 });
    });

    it('offsets each penalty with the multiple-attacks skill', async () => {
      const ctx = createCombatPluginContext({ attackNumber: 2, targetsNumber: 3, sourceSkills: skill('multiple-attacks', 30) });

      expect((await prepare(CombatMultipleAttacksPlugin, ctx)).modifiers).toEqual({
        'attack-number': -75,
        'attack-number-skill': 30,
        'attack-targets': -40,
        'attack-targets-skill': 30,
      });
    });

    it('is skipped for a single attack on a single target', async () => {
      expect((await prepare(CombatMultipleAttacksPlugin, createCombatPluginContext())).applied).toBe(false);
    });
  });

  describe('higher-ground', () => {
    it('adds +10', async () => {
      const ctx = createCombatPluginContext({ situationalModifiers: { higherGround: true } });

      expect((await prepare(CombatHigherGroundPlugin, ctx)).modifiers).toEqual({ 'higher-ground': 10 });
    });

    it('is skipped without higher ground', async () => {
      expect((await prepare(CombatHigherGroundPlugin, createCombatPluginContext())).applied).toBe(false);
    });
  });

  describe('parry', () => {
    it('subtracts the declared parry, replacing a previous one', async () => {
      const ctx = preparedContext({ parry: 20 });
      ctx.attack!.calculated!.rollModifiers.push(new KeyValueModifier('parry', -5));

      expect(await runPluginHook(CombatParryPlugin, 'parry', ctx)).toBe(true);

      expect(rollModifierValues(ctx)).toEqual({ bo: 75, parry: -20 });
      expect(getModifier(ctx.attack!.calculated!.rollModifiers, 'parry')).toMatchObject({ source: 'parry', group: 'defense' });
    });

    it('is skipped when the parry is disabled', async () => {
      const ctx = preparedContext({ parry: 20, modifiers: { disabledParry: true } });

      expect(await runPluginHook(CombatParryPlugin, 'parry', ctx)).toBe(false);
      expect(rollModifierValues(ctx)).toEqual({ bo: 75 });
    });
  });

  describe('breakage', () => {
    it.each([33, 77])('flags a breakage roll when the attack roll is %i', async attackRoll => {
      const ctx = preparedContext();
      ctx.attackRoll = attackRoll;

      expect(await runPluginHook(CombatBreakagePlugin, 'beforeAttackRoll', ctx)).toBe(true);
      expect(ctx.attack!.calculated!.breakageRoll).toBe(true);
    });

    it('is skipped for other rolls', async () => {
      const ctx = preparedContext();
      ctx.attackRoll = 34;

      expect(await runPluginHook(CombatBreakagePlugin, 'beforeAttackRoll', ctx)).toBe(false);
      expect(ctx.attack!.calculated!.breakageRoll).toBeUndefined();
    });
  });

  describe('location-armor', () => {
    const perLocation = { at: null, headAt: 2, bodyAt: 5, armsAt: 3, legsAt: 4 };

    it.each([
      ['head', 2],
      ['chest', 5],
      ['abdomen', 5],
      ['arms', 3],
      ['legs', 4],
    ] as const)('uses the armour of the %s when the target has armour per location', async (location, armorType) => {
      const ctx = preparedContext({ defense: perLocation });
      ctx.location = location;

      expect(await runPluginHook(CombatLocationArmorPlugin, 'beforeAttackRoll', ctx)).toBe(true);
      expect(ctx.armorType).toBe(armorType);
    });

    it('hits the called location and uses its armour', async () => {
      const ctx = preparedContext({ calledShot: 'legs', defense: perLocation });

      await runPluginHook(CombatLocationArmorPlugin, 'beforeAttackRoll', ctx);

      expect(ctx.location).toBe('legs');
      expect(ctx.armorType).toBe(4);
    });

    it('keeps the single armour type of the target on a called shot', async () => {
      const ctx = preparedContext({ calledShot: 'head', defense: { at: 7 } });
      ctx.armorType = 7;

      await runPluginHook(CombatLocationArmorPlugin, 'beforeAttackRoll', ctx);

      expect(ctx.location).toBe('head');
      expect(ctx.armorType).toBe(7);
    });

    it('is skipped for a target with a single armour type and no called shot', async () => {
      const ctx = preparedContext({ defense: { at: 7 } });

      expect(await runPluginHook(CombatLocationArmorPlugin, 'beforeAttackRoll', ctx)).toBe(false);
    });
  });

  describe('absolute-hit', () => {
    it('adds 1 to the critical roll per 5 points over 175', async () => {
      const ctx = preparedContext();
      ctx.rollTotal = 186;
      ctx.attackTableEntry = new AttackTableEntry('20EK', 20, 'K', 'E');

      expect(await runPluginHook(CombatAbsoluteHitPlugin, 'afterAttackRoll', ctx)).toBe(true);
      expect(getModifier(ctx.attack!.calculated!.criticalModifiers, 'absolute-hit')).toMatchObject({ value: 3, group: 'resolution' });
    });

    it('is skipped up to 175 and for fumbles', async () => {
      const ctx = preparedContext();
      ctx.rollTotal = 175;
      ctx.attackTableEntry = new AttackTableEntry('20EK', 20, 'K', 'E');
      const fumble = preparedContext();
      fumble.rollTotal = 200;

      expect(await runPluginHook(CombatAbsoluteHitPlugin, 'afterAttackRoll', ctx)).toBe(false);
      expect(await runPluginHook(CombatAbsoluteHitPlugin, 'afterAttackRoll', fumble)).toBe(false);
    });
  });

  describe('attack-size', () => {
    it('scales the damage by 50% per size and shifts the severity', async () => {
      const ctx = preparedContext({ attackSize: 1 });
      ctx.attackTableEntry = new AttackTableEntry('7BS', 7, 'S', 'B');

      await runPluginHook(CombatAttackSizePlugin, 'afterAttackRoll', ctx);

      expect(ctx.attackTableEntry).toMatchObject({ damage: 11, criticalSeverity: 'C' });
    });

    it('halves the damage and lowers the severity of a smaller attack, down to Z', async () => {
      const ctx = preparedContext({ attackSize: -1 });
      ctx.attackTableEntry = new AttackTableEntry('5AS', 5, 'S', 'A');

      await runPluginHook(CombatAttackSizePlugin, 'afterAttackRoll', ctx);

      expect(ctx.attackTableEntry).toMatchObject({ damage: 3, criticalSeverity: 'Z' });
    });

    it('caps the severity at J', async () => {
      const ctx = preparedContext({ attackSize: 2 });
      ctx.attackTableEntry = new AttackTableEntry('30IK', 30, 'K', 'I');

      await runPluginHook(CombatAttackSizePlugin, 'afterAttackRoll', ctx);

      expect(ctx.attackTableEntry.criticalSeverity).toBe('J');
    });

    it('counts the attacker size once and stacks the charge on it', async () => {
      // A big attacker (attack size 1, from its sheet) against a medium target, without and with a jog charge.
      const still = preparedContext({ attackSize: 1, sourceSize: 1, targetSize: 0 });
      still.attackTableEntry = new AttackTableEntry('10BS', 10, 'S', 'B');
      const charging = preparedContext({ attackSize: 1, sourceSize: 1, targetSize: 0, modifiers: { chargeSpeed: 'jog' } });
      charging.attackTableEntry = new AttackTableEntry('10BS', 10, 'S', 'B');

      await runPluginHook(CombatAttackSizePlugin, 'afterAttackRoll', still);
      await runPluginHook(CombatAttackSizePlugin, 'afterAttackRoll', charging);

      expect(still.attackTableEntry).toMatchObject({ damage: 15, criticalSeverity: 'C' });
      expect(charging.attackTableEntry).toMatchObject({ damage: 20, criticalSeverity: 'D' });
    });

    it('takes the target size off', async () => {
      const ctx = preparedContext({ attackSize: 0, targetSize: -1 });
      ctx.attackTableEntry = new AttackTableEntry('7BS', 7, 'S', 'B');

      await runPluginHook(CombatAttackSizePlugin, 'afterAttackRoll', ctx);

      expect(ctx.attackTableEntry).toMatchObject({ damage: 11, criticalSeverity: 'C' });
    });

    it('cancels a big attack against a big target', async () => {
      const ctx = preparedContext({ attackSize: 1, sourceSize: 1, targetSize: 1 });
      ctx.attackTableEntry = new AttackTableEntry('7BS', 7, 'S', 'B');

      expect(await runPluginHook(CombatAttackSizePlugin, 'afterAttackRoll', ctx)).toBe(false);
    });

    it('is skipped for medium attacks', async () => {
      const ctx = preparedContext({ attackSize: 0 });
      ctx.attackTableEntry = new AttackTableEntry('7BS', 7, 'S', 'B');

      expect(await runPluginHook(CombatAttackSizePlugin, 'afterAttackRoll', ctx)).toBe(false);
    });
  });

  describe('critical-expansion', () => {
    it.each([
      ['C', ['C']],
      ['F', ['E', 'A']],
      ['G', ['E', 'B']],
      ['H', ['E', 'C']],
      ['I', ['E', 'C', 'A']],
      ['J', ['E', 'C', 'B']],
    ])('turns a %s result into %j', async (severity, severities) => {
      const ctx = preparedContext();
      ctx.attackTableEntry = new AttackTableEntry(`20${severity}K`, 20, 'K', severity);

      await runPluginHook(CombatCriticalExpansionPlugin, 'afterAttackRoll', ctx);

      expect(ctx.criticalSeverities).toEqual(severities);
    });

    it('rejects an unknown severity', async () => {
      const ctx = preparedContext();
      ctx.attackTableEntry = new AttackTableEntry('20XK', 20, 'K', 'X');

      await expect(runPluginHook(CombatCriticalExpansionPlugin, 'afterAttackRoll', ctx)).rejects.toThrow(UnprocessableEntityError);
    });

    it('is skipped for a hit without critical', async () => {
      const ctx = preparedContext();
      ctx.attackTableEntry = new AttackTableEntry('7', 7, undefined, undefined);

      expect(await runPluginHook(CombatCriticalExpansionPlugin, 'afterAttackRoll', ctx)).toBe(false);
    });
  });

  describe('critical-adjustment', () => {
    it('adds the critical modifiers to the critical roll', async () => {
      const ctx = preparedContext();
      ctx.attack!.calculated!.criticalModifiers = [new KeyValueModifier('size-difference', -1), new KeyValueModifier('absolute-hit', 4)];
      ctx.criticalRoll = 50;

      await runPluginHook(CombatCriticalAdjustmentPlugin, 'criticalRoll', ctx);

      expect(ctx.criticalRoll).toBe(53);
    });

    it('leaves the roll when there are no critical modifiers', async () => {
      const ctx = preparedContext();
      ctx.attack!.calculated!.criticalModifiers = undefined;
      ctx.criticalRoll = 50;

      await runPluginHook(CombatCriticalAdjustmentPlugin, 'criticalRoll', ctx);

      expect(ctx.criticalRoll).toBe(50);
    });
  });
});
