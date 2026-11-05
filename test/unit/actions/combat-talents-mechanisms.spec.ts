import { randomUUID } from 'crypto';
import { describe, expect, it, vi } from 'vitest';
import { CreateActionCommand } from '../../../src/modules/actions/application/cqrs/commands/create-action.command.js';
import { CreateActionHandler } from '../../../src/modules/actions/application/cqrs/handlers/create-action.handler.js';
import type { ActionRepository } from '../../../src/modules/actions/application/ports/action-repository.port.js';
import type { MedicalActionService } from '../../../src/modules/actions/application/services/medical/medical-action.service.js';
import type { SpellCastingService } from '../../../src/modules/actions/application/services/spell/spell-casting.service.js';
import {
  aimingEffectOf,
  CombatEffectDefenseBonusPlugin,
  CombatEffectOffenseBonusPlugin,
  CombatOffensiveBonusPlugin,
} from '../../../src/modules/actions/application/services/combat/index.js';
import { Action, type ActionProps } from '../../../src/modules/actions/domain/aggregates/action.js';
import { parriedWithAllOb, parryAttackOf } from '../../../src/modules/actions/domain/services/parry-rules.js';
import { opportunisticStrikeTrigger, riposteOb, riposteTrigger } from '../../../src/modules/actions/domain/services/reaction-rules.js';
import { ActionApProfile } from '../../../src/modules/actions/domain/value-objects/action-ap-profile.vo.js';
import { ActionParry } from '../../../src/modules/actions/domain/value-objects/action-attack-parry.vo.js';
import { ActionAttackCalculated } from '../../../src/modules/actions/domain/value-objects/action-attack-calculated.vo.js';
import { ActionAttackResult, AttackTableEntry, Fumble } from '../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { Critical } from '../../../src/modules/actions/domain/value-objects/critical.vo.js';
import { ActionResolution } from '../../../src/modules/actions/domain/value-objects/action-resolution.vo.js';
import type { ActionType } from '../../../src/modules/actions/domain/value-objects/action-type.vo.js';
import type { HealingTablesPort } from '../../../src/modules/actor-rounds/application/ports/healing-tables.port.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { MedicalAbortService } from '../../../src/modules/actor-rounds/application/services/medical-abort.service.js';
import type { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundAttack } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-attack.vo.js';
import { ActorRoundEffect } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import type { ActorRoundItem } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-item.vo.js';
import { ActorRoundTrait } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import type { CharacterPort } from '../../../src/modules/strategic/application/ports/character.port.js';
import { effect, load } from '../actor-rounds/actor-round-test.factory.js';
import { sheetsOf } from '../support/actor-sheets.js';
import { createCombatPluginContext, rollModifierValues, runPluginHook } from './combat/combat-plugin-test.factory.js';

// Workspace spec 076, phase 2 (plan §2.1-§2.5). Invented data only.

const trait = (traitId: string, tier = 1, specialization: string | null = null) => new ActorRoundTrait(traitId, tier, specialization);

const weapon = (attackName: string, skillId: string | null, currentBo = 60, type: 'melee' | 'ranged' = 'melee', itemId?: string) => {
  const attack = new ActorRoundAttack(
    attackName,
    [],
    60,
    currentBo,
    type,
    'table',
    'fumble',
    0,
    3,
    false,
    1,
    null,
    false,
    'standard',
    skillId,
  );
  attack.itemId = itemId ?? null;
  return attack;
};

const action = (id: string, actionType: ActionType, phaseStart: number, extra: Partial<ActionProps> = {}): Action =>
  Action.fromProps({
    id,
    gameId: 'game-1',
    actorId: 'actor-1',
    round: 1,
    actionType,
    freeAction: false,
    phaseStart,
    phaseEnd: null,
    status: 'declared',
    actionPoints: null,
    movement: null,
    attacks: null,
    parries: null,
    maneuver: null,
    fatigue: null,
    description: null,
    resolution: ActionResolution.normal(),
    owner: 'owner',
    createdAt: new Date('2026-11-04T10:00:00Z'),
    updatedAt: null,
    ...extra,
  });

/**
 * An attack of `attacker-1` on `defender-1` already rolled with the total given, the defender's parry (all its OB when
 * `full`), the damage of the table and the criticals.
 */
const parriedAttack = (options: { rollTotal: number; full?: boolean; damage?: number; criticals?: number; fumble?: boolean }) => {
  const ctx = createCombatPluginContext();
  const attack = ctx.attack!;
  attack.calculated = new ActionAttackCalculated([], options.rollTotal, undefined, undefined, []);
  const criticals = Array.from(
    { length: options.criticals ?? 0 },
    (_, i) => new Critical(`c${i}`, 'pending_roll', 'S', 'A', undefined, undefined),
  );
  attack.results = new ActionAttackResult(
    new AttackTableEntry(`${options.damage ?? 0}`, options.damage ?? 0, undefined, undefined),
    criticals,
    options.fumble ? new Fumble('pending', undefined, undefined, 0, []) : undefined,
  );
  const available = 40;
  ctx.action.parries = [new ActionParry('p-1', 'defender-1', 'defender-1', 'parry', available, options.full === false ? 20 : available)];
  return { ctx, action: ctx.action, attack };
};

describe('Parry rules shared by Survival Instinct and Riposte (spec 076, §2.2)', () => {
  it('a parry with all the available OB, or a carried-over one that was', () => {
    expect(parriedWithAllOb([new ActionParry('p', 'd', 'd', 'parry', 40, 40)], 'd')).toBe(true);
    expect(parriedWithAllOb([new ActionParry('p', 'd', 'd', 'parry', 40, 39)], 'd')).toBe(false);
    expect(parriedWithAllOb([new ActionParry('p', 'd', 'x', 'protect', 40, 40)], 'd')).toBe(false);
    expect(parriedWithAllOb([new ActionParry('p', 'd', 'd', 'parry', 30, 30, undefined, undefined, true, true)], 'd')).toBe(true);
  });

  it('the weapon parried with is the one of the breakdown, else the melee attack with most OB', () => {
    const attacks = [weapon('a', 'melee-weapon@blade', 50), weapon('b', 'melee-weapon@hafted', 70), weapon('c', null, 90, 'ranged')];
    expect(parryAttackOf(attacks)?.attackName).toBe('b');
    const parry = new ActionParry('p', 'd', 'd', 'parry', 40, 40, undefined, undefined, undefined, undefined, {
      attackName: 'a',
      bo: 50,
      penalty: 0,
    });
    expect(parryAttackOf(attacks, parry)?.attackName).toBe('a');
  });
});

describe('Riposte trigger (spec 076, decision B2)', () => {
  const defender = (traits: ActorRoundTrait[], skillId = 'melee-weapon@blade') =>
    ({ actorId: 'defender-1', traits, attacks: [weapon('mainHand', skillId)] }) as unknown as ActorRound;

  it('follows the example: a total of 35 fully parried gives a riposte at +15, one of 70 at -20', () => {
    for (const [rollTotal, ob] of [
      [35, 15],
      [70, -20],
    ]) {
      const { action, attack } = parriedAttack({ rollTotal });
      expect(riposteTrigger(action, attack, defender([trait('riposte', 1, 'melee-weapon@blade')]))).toEqual({
        traitId: 'riposte',
        triggerActionId: 'action-1',
        targetActorId: 'attacker-1',
        obOverride: ob,
      });
    }
    expect(riposteOb(35)).toBe(15);
  });

  it('does not trigger with a partial parry, damage, a critical or a talent for another weapon', () => {
    const riposte = [trait('riposte', 1, 'melee-weapon@blade')];
    const partial = parriedAttack({ rollTotal: 35, full: false });
    expect(riposteTrigger(partial.action, partial.attack, defender(riposte))).toBeUndefined();
    const hurt = parriedAttack({ rollTotal: 35, damage: 3 });
    expect(riposteTrigger(hurt.action, hurt.attack, defender(riposte))).toBeUndefined();
    const critical = parriedAttack({ rollTotal: 35, criticals: 1 });
    expect(riposteTrigger(critical.action, critical.attack, defender(riposte))).toBeUndefined();
    const other = parriedAttack({ rollTotal: 35 });
    expect(riposteTrigger(other.action, other.attack, defender(riposte, 'melee-weapon@hafted'))).toBeUndefined();
    expect(riposteTrigger(other.action, other.attack, defender([]))).toBeUndefined();
  });
});

describe('Opportunistic Strike trigger (spec 076, decision B3)', () => {
  const target = (traits: ActorRoundTrait[], attacks = [weapon('mainHand', 'melee-weapon@blade')]) =>
    ({ actorId: 'defender-1', traits, attacks }) as unknown as ActorRound;

  it('triggers on a fumbled melee attack when the target has the talent with a weapon of its specialization', () => {
    const { action, attack } = parriedAttack({ rollTotal: 2, fumble: true });
    expect(opportunisticStrikeTrigger(action, attack, target([trait('opportunistic-strike', 1, 'blade')]))).toEqual({
      traitId: 'opportunistic-strike',
      triggerActionId: 'action-1',
      targetActorId: 'attacker-1',
      obOverride: null,
    });
  });

  it('does not trigger without a fumble, without the talent or with a broken or other weapon', () => {
    const fumbled = parriedAttack({ rollTotal: 2, fumble: true });
    const clean = parriedAttack({ rollTotal: 2 });
    const talent = [trait('opportunistic-strike', 1, 'blade')];
    expect(opportunisticStrikeTrigger(clean.action, clean.attack, target(talent))).toBeUndefined();
    expect(opportunisticStrikeTrigger(fumbled.action, fumbled.attack, target([]))).toBeUndefined();
    expect(opportunisticStrikeTrigger(fumbled.action, fumbled.attack, target(talent, [weapon('mainHand', 'melee-weapon@hafted')]))).toBe(
      undefined,
    );
    const broken = weapon('mainHand', 'melee-weapon@blade');
    broken.broken = true;
    expect(opportunisticStrikeTrigger(fumbled.action, fumbled.attack, target(talent, [broken]))).toBeUndefined();
  });
});

describe('Reaction alerts (spec 076, decision B1)', () => {
  const reaction = {
    traitId: 'riposte' as const,
    triggerActionId: 'a-1',
    targetActorId: 'foe',
    obOverride: 15,
    round: 1,
    phase: 'phase_2' as const,
  };

  it('raises one alert per talent and trigger, the game master can dismiss it, and it expires with the phase', () => {
    const round = load();
    const alert = round.addReactionAlert(reaction)!;
    expect(alert).toMatchObject({ type: 'reaction-available', status: 'pending', reaction });
    expect(round.addReactionAlert(reaction)).toBeUndefined();
    expect(round.pendingReactionAlert(alert.id)).toBe(alert);

    const other = round.addReactionAlert({ ...reaction, triggerActionId: 'a-2' })!;
    round.resolveAlert(other.id);
    expect(other.status).toBe('resolved');

    expect(round.expireReactionAlerts()).toBe(true);
    expect(alert.status).toBe('expired');
    expect(round.pendingReactionAlert(alert.id)).toBeUndefined();
    expect(round.expireReactionAlerts()).toBe(false);
  });
});

describe('Forced reaction attacks (spec 076, decision B1)', () => {
  it('is declared without AP, takes no AP penalty and cannot be other than an attack', () => {
    const round = load();
    const plan = Action.checkDeclaration(
      round,
      [],
      { actionType: 'melee_attack', phaseStart: 2, freeAction: false, forced: 'reaction' },
      2,
    );
    expect(plan).toEqual({ spend: null, interrupted: [] });
    expect(() =>
      Action.checkDeclaration(round, [], { actionType: 'maneuver', phaseStart: 2, freeAction: false, forced: 'reaction' }, 2),
    ).toThrow(expect.objectContaining({ code: 'err-reaction-invalid-action' }));

    const reaction = action('r', 'melee_attack', 2, {
      resolution: ActionResolution.forced('reaction'),
      reaction: { traitId: 'riposte', triggerActionId: 't', obOverride: 15, alertId: 'al' },
    });
    expect(reaction.takesApPenalty()).toBe(false);
    expect(reaction.isReaction()).toBe(true);
    expect(reaction.readiness(round, 2)).toMatchObject({ actionPoints: 0, readinessPenalty: 0 });
    expect(ActionResolution.forced('reaction').apSource).toBe('none');
  });

  it('cannot force an existing action as a reaction', () => {
    const round = load();
    const melee = action('m', 'melee_attack', 1);
    expect(() => melee.force(round, 1, 'reaction')).toThrow(expect.objectContaining({ code: 'err-action-force-invalid-reason' }));
  });

  it('the OB plugin uses the fixed OB of a riposte instead of the declared one', async () => {
    const ctx = createCombatPluginContext({ bo: 60 });
    ctx.attack!.reaction = { traitId: 'riposte', triggerActionId: 't', obOverride: -20 };
    await runPluginHook(CombatOffensiveBonusPlugin, 'prepare', ctx);
    expect(rollModifierValues(ctx).bo).toBe(-20);

    const normal = createCombatPluginContext({ bo: 60 });
    await runPluginHook(CombatOffensiveBonusPlugin, 'prepare', normal);
    expect(rollModifierValues(normal).bo).toBe(60);
  });
});

describe('AP of drawing and instantaneous actions (spec 076, decisions B4-B5)', () => {
  it('draw_and_load takes 0 AP with Quickdraw, 2 with Slow on the Draw while surprised, 1 otherwise', () => {
    expect(ActionApProfile.forAction('draw_and_load')).toMatchObject({ min: 1, max: 1 });
    expect(ActionApProfile.forAction('draw_and_load', { draw: { quickdraw: true } })).toMatchObject({ min: 0, max: 0 });
    expect(ActionApProfile.forAction('draw_and_load', { draw: { slowOnTheDraw: true } })).toMatchObject({ min: 2, max: 2 });
    expect(ActionApProfile.forAction('draw_and_load', { draw: { quickdraw: true, slowOnTheDraw: true } })).toMatchObject({ max: 0 });
  });

  const free = (round: ActorRound, actions: Action[], actionType: ActionType = 'other') =>
    Action.checkDeclaration(round, actions, { actionType, phaseStart: 1, freeAction: true }, 1).spend;
  const instant = (id: string, actionType: ActionType = 'other', extra: Partial<ActionProps> = {}) =>
    action(id, actionType, 1, { freeAction: true, ...extra });

  it('Quick Action makes the first two instantaneous actions free; the third takes 1 AP', () => {
    const quick = load({ traits: [trait('quick-action')] });
    expect(free(quick, [])).toMatchObject({ ap: 0 });
    expect(free(quick, [instant('i1')])).toMatchObject({ ap: 0 });
    expect(free(quick, [instant('i1'), instant('i2')])).toMatchObject({ ap: 1 });
    expect(free(load(), [instant('i1')])).toMatchObject({ ap: 1 });
  });

  it('Quick Action does not make a second instantaneous spell free', () => {
    const quick = load({ traits: [trait('quick-action')] });
    expect(free(quick, [instant('i1')], 'cast_spell')).toMatchObject({ ap: 1 });
    expect(free(quick, [], 'cast_spell')).toMatchObject({ ap: 0 });
  });

  it('a draw with Quickdraw takes 0 AP and does not use up the free instantaneous action', () => {
    const round = load();
    const plan = Action.checkDeclaration(round, [], { actionType: 'draw_and_load', phaseStart: 1, freeAction: true, zeroCost: true }, 1);
    expect(plan).toEqual({ spend: { phase: 1, ap: 0, kind: 'instant' }, interrupted: [] });
    const drawn = instant('draw', 'draw_and_load', { apRange: { min: 0, max: 0 } });
    expect(drawn.countsAsInstant()).toBe(false);
    expect(free(round, [drawn])).toMatchObject({ ap: 0 });
  });
});

describe('CreateActionHandler: draws and reactions (spec 076)', () => {
  const sword: ActorRoundItem = {
    itemId: 'sword-1',
    name: 'Sword',
    kind: 'weapon',
    slot: 'mainHand',
    strength: null,
    modifiers: [],
    startModifierIds: [],
  };

  const setup = (actorRound: ActorRound, roundActions: Action[] = [], phase = 'phase_1') => {
    const game = { id: 'game-1', name: 'g', round: 1, phase, getActionPhase: () => Number(phase.slice(-1)) };
    const actionRepository = {
      findByRsql: vi.fn(() => Promise.resolve({ content: roundActions })),
      findById: vi.fn((id: string) => Promise.resolve(roundActions.find(each => each.id === id) ?? null)),
      save: vi.fn((saved: Action) => Promise.resolve(saved)),
      update: vi.fn((updated: Action) => Promise.resolve(updated)),
    } as unknown as ActionRepository;
    const actorRoundUpdate = vi.fn(() => Promise.resolve());
    const handler = new CreateActionHandler(
      { findById: vi.fn(() => Promise.resolve(game)) } as unknown as GameRepository,
      { findByRsql: vi.fn(() => Promise.resolve({ content: [actorRound] })), update: actorRoundUpdate } as unknown as ActorRoundRepository,
      actionRepository,
      { publish: vi.fn(() => Promise.resolve()) },
      { findSkill: vi.fn(), findManeuverModifiers: vi.fn() },
      sheetsOf({ findById: vi.fn(() => Promise.resolve(null)) } as unknown as CharacterPort),
      {} as SpellCastingService,
      {} as HealingTablesPort,
      {} as MedicalActionService,
      new MedicalAbortService({} as ActorRoundRepository),
    );
    return { handler, actorRoundUpdate };
  };

  const draw = (itemId?: string, freeAction = false, phase = 1) =>
    new CreateActionCommand(
      'game-1',
      'actor-1',
      'draw_and_load',
      freeAction,
      phase,
      undefined,
      '',
      'user',
      [],
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      {
        itemId,
      },
    );

  const roundWith = (traits: ActorRoundTrait[], effects: ActorRoundEffect[] = []) => {
    const round = load({ traits, effects, attacks: [weapon('mainHand', 'melee-weapon@blade', 60, 'melee', 'sword-1')] });
    round.items = [sword];
    return round;
  };

  it('a draw with Quickdraw for the weapon is instantaneous at 0 AP', async () => {
    const round = roundWith([trait('quickdraw', 1, 'blade')]);
    const created = await setup(round).handler.execute(draw('sword-1'));
    expect(created).toMatchObject({ freeAction: true, apRange: { min: 0, max: 0 }, drawAndLoad: { itemId: 'sword-1' } });
    expect(created.apProfile()).toMatchObject({ min: 0, max: 0 });
  });

  it('without the weapon, Quickdraw does not apply; an item not in the equipment is rejected', async () => {
    const round = roundWith([trait('quickdraw', 1, 'blade')]);
    const created = await setup(round).handler.execute(draw(undefined));
    expect(created).toMatchObject({ freeAction: false, apRange: null });
    await expect(setup(roundWith([])).handler.execute(draw('axe-1'))).rejects.toMatchObject({ code: 'err-item-not-equipped' });
  });

  it('a surprised actor with Slow on the Draw takes 2 AP to draw, never instantaneous', async () => {
    const round = roundWith([trait('slow-on-the-draw')], [effect('surprised', 1)]);
    // Surprised, it has no AP in phase 1
    const created = await setup(round, [], 'phase_2').handler.execute(draw('sword-1', true, 2));
    expect(created).toMatchObject({ freeAction: false, apRange: { min: 2, max: 2 } });
  });

  const reactionCommand = (forced: CreateActionCommand['forced']) =>
    new CreateActionCommand('game-1', 'actor-1', 'melee_attack', false, 2, undefined, '', 'user', [], forced);

  it('declares a reaction from its alert: the alert is resolved and the reaction copied, at 0 AP', async () => {
    const round = roundWith([trait('riposte', 1, 'blade')]);
    const alert = round.addReactionAlert({
      traitId: 'riposte',
      triggerActionId: 'trigger-1',
      targetActorId: 'foe',
      obOverride: 15,
      round: 1,
      phase: 'phase_2',
    })!;
    const { handler, actorRoundUpdate } = setup(round, [], 'phase_2');
    const created = await handler.execute(reactionCommand({ reason: 'reaction', alertId: alert.id }));
    expect(created.reaction).toEqual({ traitId: 'riposte', triggerActionId: 'trigger-1', obOverride: 15, alertId: alert.id });
    expect(created.resolution).toMatchObject({ mode: 'forced', reason: 'reaction', apSource: 'none' });
    expect(alert.status).toBe('resolved');
    expect(round.spentByAction(created.id)).toBe(0);
    expect(actorRoundUpdate).toHaveBeenCalledWith(round);
    // Once taken, or in another phase, it is not available
    await expect(handler.execute(reactionCommand({ reason: 'reaction', alertId: alert.id }))).rejects.toMatchObject({
      code: 'err-reaction-not-available',
    });
  });

  it('rejects an alert of another phase, and a reaction without its alert', async () => {
    const round = roundWith([]);
    const alert = round.addReactionAlert({
      traitId: 'opportunistic-strike',
      triggerActionId: 'trigger-1',
      targetActorId: 'foe',
      obOverride: null,
      round: 1,
      phase: 'phase_1',
    })!;
    await expect(
      setup(round, [], 'phase_2').handler.execute(reactionCommand({ reason: 'reaction', alertId: alert.id })),
    ).rejects.toMatchObject({
      code: 'err-reaction-not-available',
    });
    await expect(setup(round, [], 'phase_2').handler.execute(reactionCommand({ reason: 'reaction' }))).rejects.toMatchObject({
      code: 'err-reaction-not-available',
    });
  });
});

describe('OB and DB effects (spec 076, §2.4)', () => {
  const withData = (status: string, value: number, targetActorId?: string, data?: Record<string, unknown>) =>
    new ActorRoundEffect(
      randomUUID(),
      status,
      value,
      undefined,
      undefined,
      undefined,
      undefined,
      targetActorId,
      undefined,
      undefined,
      undefined,
      data,
    );

  it('adds the OB bonuses (they add up) and Battle Cry to the attack, each with its key', async () => {
    const ctx = createCombatPluginContext({
      sourceEffects: [withData('ob_bonus', 5), withData('ob_bonus', 10), withData('battle-cry', 10)],
    });
    await runPluginHook(CombatEffectOffenseBonusPlugin, 'prepare', ctx);
    expect(rollModifierValues(ctx)).toMatchObject({ 'ob-bonus': 15, 'battle-cry': 10 });
  });

  it('adds the aiming only to a ranged attack against the foe aimed at, with the item aimed with', async () => {
    const aimed = createCombatPluginContext({ attackType: 'ranged', sourceEffects: [withData('aiming', 10, 'defender-1')] });
    await runPluginHook(CombatEffectOffenseBonusPlugin, 'prepare', aimed);
    expect(rollModifierValues(aimed).aiming).toBe(10);

    const otherFoe = createCombatPluginContext({ attackType: 'ranged', sourceEffects: [withData('aiming', 10, 'someone-else')] });
    expect(aimingEffectOf(otherFoe)).toBeUndefined();
    const otherItem = createCombatPluginContext({
      attackType: 'ranged',
      sourceEffects: [withData('aiming', 10, 'defender-1', { itemId: 'bow-2' })],
    });
    expect(aimingEffectOf(otherItem)).toBeUndefined();
    const melee = createCombatPluginContext({ sourceEffects: [withData('aiming', 10, 'defender-1')] });
    expect(aimingEffectOf(melee)).toBeUndefined();
  });

  it("takes the target's DB bonuses and Battle Cry off the attack", async () => {
    const ctx = createCombatPluginContext({ targetEffects: [withData('db_bonus', 5), withData('battle-cry', 10)] });
    await runPluginHook(CombatEffectDefenseBonusPlugin, 'prepare', ctx);
    expect(rollModifierValues(ctx)).toMatchObject({ 'db-bonus': -5, 'battle-cry-db': -10 });
  });

  it('keeps one Battle Cry for the combat, replaces aiming, critical reroll and precision, and stacks OB bonuses', () => {
    const round = load();
    round.applyAttackResults(0, [effect('battle-cry'), effect('battle-cry', 20)], undefined);
    expect(round.effects.filter(e => e.status === 'battle-cry')).toEqual([expect.objectContaining({ value: 10, rounds: undefined })]);

    round.applyAttackResults(0, [withData('aiming', 5, 'foe-1'), withData('aiming', 10, 'foe-2')], undefined);
    expect(round.effects.filter(e => e.status === 'aiming')).toEqual([expect.objectContaining({ value: 10, targetActorId: 'foe-2' })]);
    round.applyAttackResults(
      0,
      [withData('critical-reroll', 0, 'foe-1', { kind: 'offense' }), withData('critical-reroll', 0, 'foe-2', { kind: 'offense' })],
      undefined,
    );
    expect(round.effects.filter(e => e.status === 'critical-reroll')).toEqual([expect.objectContaining({ targetActorId: 'foe-2' })]);

    round.applyAttackResults(0, [effect('ob_bonus', 5), effect('ob_bonus', 5)], undefined);
    expect(round.effects.filter(e => e.status === 'ob_bonus')).toHaveLength(2);
    expect(() => round.applyAttackResults(0, [effect('db_bonus', 0)], undefined)).toThrow(
      expect.objectContaining({ code: 'err-effect-invalid-value' }),
    );
  });
});

describe('Spasm (spec 076, §2.4)', () => {
  it('stuns at -50, takes 2 AP and 1 hit in every upkeep while it lasts', () => {
    const round = load();
    round.applyAttackResults(0, [effect('spasm', undefined, 2)], undefined);

    expect(round.effects.find(e => e.status === 'spasm')).toMatchObject({ value: -50, rounds: 2 });
    expect(round.getPenaltySum()).toBe(-50);
    expect(round.totalCapacity()).toBe(2);
    expect(round.apModifiers).toContainEqual(expect.objectContaining({ source: 'spasm', kind: 'loss', value: 2 }));
    expect(round.canHeal()).toBe(false);

    round.applyUpkeep();
    expect(round.hp.current).toBe(49);
    expect(round.hpLog.at(-1)).toMatchObject({ kind: 'spasm', amount: -1 });
    expect(round.effects.find(e => e.status === 'spasm')?.rounds).toBe(1);
    round.applyUpkeep();
    expect(round.hp.current).toBe(48);
    expect(round.hasEffect('spasm')).toBe(false);
    expect(round.getPenaltySum()).toBe(0);
  });
});
