import { describe, expect, it } from 'vitest';
import { ActionAttackCalculated } from '../../../../src/modules/actions/domain/value-objects/action-attack-calculated.vo.js';
import { ActionParry } from '../../../../src/modules/actions/domain/value-objects/action-attack-parry.vo.js';
import type { ActionAttack } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { KeyValueModifier } from '../../../../src/modules/actions/domain/value-objects/key-value-modifier.vo.js';
import { Action } from '../../../../src/modules/actions/domain/aggregates/action.js';
import { CombatParryPlugin, CombatPositionalTargetPlugin } from '../../../../src/modules/actions/application/services/combat/index.js';
import type { CombatContext } from '../../../../src/modules/actions/application/services/combat/combat-context.js';
import { createCombatPluginContext, getModifier, rollModifierValues, runPluginHook } from './combat-plugin-test.factory.js';

const reverseStrike = (bonus: number) => [{ skillId: 'reverse-strike', bonus, ranks: 0 }];

const prepare = async (ctx: CombatContext) => {
  await runPluginHook(CombatPositionalTargetPlugin, 'prepare', ctx, 0);
  const applied = await runPluginHook(CombatPositionalTargetPlugin, 'prepare', ctx, 1);
  return { applied, modifiers: rollModifierValues(ctx) };
};

/** An attack action of another actor of the round against the defender of the factory. */
const foeAction = (actorId: string, targetId = 'defender-1', status: Action['status'] = 'declared') =>
  Action.fromProps({
    id: `action-${actorId}`,
    gameId: 'game-1',
    actorId,
    round: 1,
    actionType: 'melee_attack',
    freeAction: false,
    phaseStart: 1,
    phaseEnd: null,
    status,
    actionPoints: 4,
    movement: null,
    attacks: [{ attackName: 'mainHand', type: 'melee', modifiers: { targetId } } as unknown as ActionAttack],
    parries: null,
    maneuver: null,
    fatigue: null,
    description: null,
    owner: 'owner-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: null,
  });

describe('Workspace spec 079, A1: Reverse Strike of the defender (§9.5)', () => {
  it('reduces the rear bonus by half the Reverse Strike (Anika: +70 cancels the +35)', async () => {
    const ctx = createCombatPluginContext({ situationalModifiers: { positionalTarget: 'rear' }, targetSkills: reverseStrike(70) });

    const { applied, modifiers } = await prepare(ctx);

    expect(applied).toBe(true);
    expect(modifiers).toEqual({ 'positional-target': 35, 'positional-target-skill': -35 });
    expect(getModifier(ctx.attackPreparation!.modifiers.rollModifiers, 'positional-target-skill')).toMatchObject({
      group: 'situation',
      source: 'positional-target',
      params: { skill: 70, foes: 1, bonus: 35 },
    });
  });

  it('never takes off more than the bonus', async () => {
    const ctx = createCombatPluginContext({ situationalModifiers: { positionalTarget: 'flank' }, targetSkills: reverseStrike(80) });

    expect((await prepare(ctx)).modifiers).toEqual({ 'positional-target': 15, 'positional-target-skill': -15 });
  });

  it('divides the skill by the distinct foes attacking the target this round, rounding down', async () => {
    const ctx = createCombatPluginContext({
      situationalModifiers: { positionalTarget: 'rear' },
      targetSkills: reverseStrike(70),
      roundActions: [foeAction('foe-2'), foeAction('foe-3'), foeAction('foe-3'), foeAction('other', 'someone-else')],
    });

    // 70 / 2 / 3 = 11.67 → 11
    expect((await prepare(ctx)).modifiers).toEqual({ 'positional-target': 35, 'positional-target-skill': -11 });
  });

  it('leaves out interrupted actions when counting the foes', async () => {
    const ctx = createCombatPluginContext({
      situationalModifiers: { positionalTarget: 'rear' },
      targetSkills: reverseStrike(40),
      roundActions: [foeAction('foe-2', 'defender-1', 'interrupted')],
    });

    expect((await prepare(ctx)).modifiers).toEqual({ 'positional-target': 35, 'positional-target-skill': -20 });
  });

  it('does not apply to a surprised target, and says why', async () => {
    const ctx = createCombatPluginContext({
      situationalModifiers: { positionalTarget: 'rear', targetStatus: ['surprised'] },
      targetSkills: reverseStrike(70),
    });

    expect(await prepare(ctx)).toEqual({ applied: false, modifiers: { 'positional-target': 35 } });
    expect(ctx.skipped).toEqual([expect.objectContaining({ reason: 'reverse-strike-surprised', params: { skill: 70 } })]);
  });

  it('does not apply to a flatfooted target, a target without the skill, or in front', async () => {
    const flatfooted = createCombatPluginContext({
      situationalModifiers: { positionalTarget: 'rear', targetStatus: ['flatfooted'] },
      targetSkills: reverseStrike(70),
    });
    const unskilled = createCombatPluginContext({ situationalModifiers: { positionalTarget: 'rear' } });
    const front = createCombatPluginContext({ targetSkills: reverseStrike(70) });

    expect((await prepare(flatfooted)).applied).toBe(false);
    expect((await prepare(unskilled)).applied).toBe(false);
    expect((await prepare(front)).applied).toBe(false);
  });
});

/** A context after the prepare phase with the defender's parry of `parry` OB from `position`. */
const parryContext = (parry: number, position: 'flank' | 'rear' | null, reverseStrike = 0, restrictedParry = false): CombatContext => {
  const ctx = createCombatPluginContext({ parry, modifiers: { restrictedParry } });
  ctx.attack!.calculated = new ActionAttackCalculated([new KeyValueModifier('bo', 75)], 75, undefined, undefined, []);
  ctx.attackPreparation = undefined;
  const own = new ActionParry('p-1', 'defender-1', 'defender-1', 'parry', 100, parry);
  own.positional = Action.parryPositional(position, reverseStrike);
  ctx.action.parries = [own];
  return ctx;
};

describe('Workspace spec 079, A2: parry toward the flank or the rear (§9.6)', () => {
  it('takes 70 off a parry to the rear, offset 1:1 by Reverse Strike (Niles: 50 parry, +50 RS → 30)', async () => {
    const ctx = parryContext(50, 'rear', 50);

    await runPluginHook(CombatParryPlugin, 'parry', ctx);

    expect(rollModifierValues(ctx)).toEqual({ bo: 75, parry: -50, 'parry-positional': 20 });
    expect(getModifier(ctx.attack!.calculated!.rollModifiers, 'parry-positional')).toMatchObject({
      group: 'defense',
      params: { position: 'rear', penalty: -70, skill: 50, parry: 50 },
    });
  });

  it('takes 30 off a parry to the flank, never more than the parry', async () => {
    const flank = parryContext(50, 'flank');
    const small = parryContext(10, 'rear');

    await runPluginHook(CombatParryPlugin, 'parry', flank);
    await runPluginHook(CombatParryPlugin, 'parry', small);

    expect(rollModifierValues(flank)).toEqual({ bo: 75, parry: -50, 'parry-positional': 30 });
    expect(rollModifierValues(small)).toEqual({ bo: 75, parry: -10, 'parry-positional': 10 });
  });

  it('works on the DB of a restricted parry', async () => {
    const ctx = parryContext(40, 'flank', 0, true);

    await runPluginHook(CombatParryPlugin, 'parry', ctx);

    expect(rollModifierValues(ctx)).toEqual({ bo: 75, 'restricted-parry': -20, 'parry-positional': 20 });
  });

  it('adds nothing from the front, with enough Reverse Strike or without a parry', async () => {
    const front = parryContext(50, null);
    const skilled = parryContext(50, 'flank', 40);
    const none = parryContext(0, 'rear');

    for (const ctx of [front, skilled, none]) await runPluginHook(CombatParryPlugin, 'parry', ctx);

    expect(rollModifierValues(front)).toEqual({ bo: 75, parry: -50 });
    expect(rollModifierValues(skilled)).toEqual({ bo: 75, parry: -50 });
    expect(rollModifierValues(none)).toEqual({ bo: 75 });
  });

  it('replaces the positional reduction of a previous declaration', async () => {
    const ctx = parryContext(50, 'rear');
    await runPluginHook(CombatParryPlugin, 'parry', ctx);
    ctx.action.parries![0].parry = 20;
    ctx.attack!.modifiers.parry = 20;

    await runPluginHook(CombatParryPlugin, 'parry', ctx);

    expect(rollModifierValues(ctx)).toEqual({ bo: 75, parry: -20, 'parry-positional': 20 });
  });
});
