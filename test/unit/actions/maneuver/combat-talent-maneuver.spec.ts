import { describe, expect, it, vi } from 'vitest';
import {
  ManeuverRoll,
  ResolveManeuverCommand,
  ResolveManeuverRequest,
} from '../../../../src/modules/actions/application/cqrs/commands/resolve-maneuver.command.js';
import { ApplyAttackHandler } from '../../../../src/modules/actions/application/cqrs/handlers/apply-attack.handler.js';
import { ResolveManeuverHandler } from '../../../../src/modules/actions/application/cqrs/handlers/resolve-maneuver.handler.js';
import {
  CombatCriticalAdjustmentPlugin,
  CombatPrecisionPlugin,
} from '../../../../src/modules/actions/application/services/combat/index.js';
import type { CombatTalentChoices } from '../../../../src/modules/actions/domain/services/combat-talent-maneuver.js';
import type { ManeuverPurpose } from '../../../../src/modules/actions/domain/value-objects/maneuver-purpose.vo.js';
import type { ActorRound } from '../../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import type { ActorRoundEffect } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { ActorRoundTrait } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import type { CharacterSkill } from '../../../../src/modules/strategic/application/ports/character.port.js';
import { load } from '../../actor-rounds/actor-round-test.factory.js';
import { createCombatPluginContext, rollModifierValues, runPluginHook } from '../combat/combat-plugin-test.factory.js';
import { breakdown, type ManeuverSetup, setupManeuver } from './maneuver-test.factory.js';

// Workspace spec 076, phase 3 (plan §2.6, §2.8): maneuvers of the combat talents and the luck talents. Invented data.

const trait = (traitId: string, tier = 1, specialization: string | null = null) => new ActorRoundTrait(traitId, tier, specialization);

const foe = (): ActorRound => {
  const round = load();
  Object.assign(round, { actorId: 'foe-1', id: 'foe-round-1' });
  return round;
};

interface ResolveOptions extends ManeuverSetup {
  traits?: ActorRoundTrait[];
  purpose?: ManeuverPurpose;
  combatTalent?: CombatTalentChoices;
  roll?: ManeuverRoll;
  difficulty?: string;
  passiveTotal?: number;
  spasmRounds?: number;
  /** Actor rounds of the actor in earlier rounds (Battle Cry). */
  earlierRounds?: number;
}

const resolve = async (options: ResolveOptions) => {
  const { traits = [], purpose, combatTalent, roll = new ManeuverRoll(80), earlierRounds = 0, ...setupOptions } = options;
  const setup = setupManeuver({
    targets: [{ actorRound: foe() }],
    ...setupOptions,
    actorRound: actorRound => {
      actorRound.traits = traits;
      setupOptions.actorRound?.(actorRound);
    },
  });
  const findByRsql = vi.fn(() => Promise.resolve({ content: Array.from({ length: earlierRounds }, () => load()) }));
  Object.assign(setup.actorRoundRepository, { findByRsql });
  const request = Object.assign(new ResolveManeuverRequest((options.difficulty ?? 'h') as never, {}), {
    purpose,
    combatTalent,
    passiveTotal: options.passiveTotal,
    spasmRounds: options.spasmRounds,
  });
  const handler = new ResolveManeuverHandler(
    setup.gameRepository,
    setup.actorRoundRepository,
    setup.actionRepository,
    setup.eventBus,
    setup.maneuverPort,
    setup.contextService,
    setup.psychologyTables,
  );
  const result = await handler.execute(new ResolveManeuverCommand('action-1', request, roll, 'user-1', []));
  return { setup, result, findByRsql, modifiers: breakdown(result.maneuver!.roll!.modifiers) };
};

const effectsOf = (round: ActorRound, status: string): ActorRoundEffect[] => round.effects.filter(effect => effect.status === status);

describe('Battle Cry (spec 076, decision B7)', () => {
  const battleCry = (options: ResolveOptions = {}) =>
    resolve({ skillId: 'influence', phase: 'phase_2', traits: [trait('battle-cry')], purpose: 'battle-cry', ...options });

  it('takes 2 AP, medium difficulty and -2 per level of the highest foe; on a success, +10 OB and DB for the combat', async () => {
    const { setup, result, modifiers, findByRsql } = await battleCry({ combatTalent: { foeLevel: 6 } });
    expect(result.apRange).toEqual({ min: 2, max: 2 });
    expect(modifiers).toMatchObject({ difficulty: 0, 'battle-cry-foe-level': -12 });
    expect(result.maneuver!.modifiers).toMatchObject({ purpose: 'battle-cry', difficulty: 'm', foeLevel: 6 });
    expect(effectsOf(setup.actorRound, 'battle-cry')).toEqual([expect.objectContaining({ value: 10, rounds: undefined })]);
    expect(findByRsql).toHaveBeenCalledWith('gameId==game-1;actorId==actor-1;round<1', 0, 1);
    expect(setup.actorRoundUpdate).toHaveBeenCalled();
  });

  it('is only made in the first round of the actor in the combat', async () => {
    await expect(battleCry({ earlierRounds: 1 })).rejects.toMatchObject({ code: 'err-battle-cry-not-first-round' });
  });

  it('needs the talent, Influence, and 2 AP', async () => {
    await expect(battleCry({ traits: [] })).rejects.toMatchObject({ code: 'err-maneuver-purpose-trait-required' });
    await expect(battleCry({ skillId: 'old-lore' })).rejects.toMatchObject({ code: 'err-maneuver-purpose-skill' });
    await expect(battleCry({ phase: 'phase_1' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('gives nothing on a failure', async () => {
    const { setup } = await battleCry({ absolute: { result: 'failure', message: 'No', effects: [] } });
    expect(effectsOf(setup.actorRound, 'battle-cry')).toEqual([]);
  });
});

describe('Sense Weakness and Study Offense (spec 076, decision B8, P4)', () => {
  const perception = (purpose: ManeuverPurpose, options: ResolveOptions = {}) =>
    resolve({
      skillId: 'perception',
      phase: 'phase_4',
      traits: [trait('sense-weakness'), trait('study-offense', 1, 'blade')],
      purpose,
      combatTalent: { foeActorId: 'foe-1' },
      ...options,
    });

  it('a full round of Perception gives a critical reroll against the foe: offense for Sense Weakness', async () => {
    const { setup, result } = await perception('sense-weakness');
    expect(result.apRange).toEqual({ min: 4, max: 4 });
    expect(result.maneuver!.modifiers.foeActorId).toBe('foe-1');
    expect(effectsOf(setup.actorRound, 'critical-reroll')).toEqual([
      expect.objectContaining({ targetActorId: 'foe-1', data: { kind: 'offense' } }),
    ]);
  });

  it('Study Offense gives one of kind defense, which does not replace the offense one; a new one of a kind does', async () => {
    const { setup } = await perception('study-offense');
    const holder = setup.actorRound;
    expect(effectsOf(holder, 'critical-reroll').map(effect => effect.data?.kind)).toEqual(['defense']);
    const second = await perception('sense-weakness', {
      actorRound: round => {
        round.effects.push(...holder.effects);
      },
    });
    expect(effectsOf(second.setup.actorRound, 'critical-reroll').map(effect => effect.data?.kind)).toEqual(['defense', 'offense']);
    const third = await perception('sense-weakness', {
      actorRound: round => {
        round.effects.push(...second.setup.actorRound.effects);
      },
    });
    expect(effectsOf(third.setup.actorRound, 'critical-reroll')).toHaveLength(2);
  });

  it('needs a foe of the round, the talent, Perception and the full round', async () => {
    await expect(perception('sense-weakness', { combatTalent: {} })).rejects.toMatchObject({
      code: 'err-maneuver-purpose-target-required',
    });
    await expect(perception('sense-weakness', { combatTalent: { foeActorId: 'actor-1' } })).rejects.toMatchObject({
      code: 'err-maneuver-purpose-target-required',
    });
    await expect(perception('sense-weakness', { combatTalent: { foeActorId: 'nobody' } })).rejects.toMatchObject({
      code: 'err-maneuver-target-not-found',
    });
    await expect(perception('study-offense', { traits: [trait('sense-weakness')] })).rejects.toMatchObject({
      code: 'err-maneuver-purpose-trait-required',
    });
    await expect(perception('sense-weakness', { skillId: 'old-lore' })).rejects.toMatchObject({ code: 'err-maneuver-purpose-skill' });
    await expect(perception('sense-weakness', { phase: 'phase_3' })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('Precision from the maneuver to the critical (spec 076, decision B9)', () => {
  const ambushSkills: CharacterSkill[] = [{ skillId: 'ambush', specialization: null, totalBonus: 40, ranks: 7 }];
  const precision = (options: ResolveOptions = {}) =>
    resolve({
      skillId: 'ambush',
      skills: ambushSkills,
      traits: [trait('precision', 1, 'blade')],
      purpose: 'precision',
      combatTalent: { foeActorId: 'foe-1', position: 'flank', obPenalty: 20 },
      ...options,
    });

  it('takes the difficulty of the position, made easier by the OB given up, and gives half the Ambush ranks', async () => {
    const { setup, modifiers, result } = await precision();
    expect(modifiers).toMatchObject({ difficulty: 0, 'precision-position': -70, 'precision-ob-penalty': 20 });
    expect(result.maneuver!.modifiers).toMatchObject({ position: 'flank', obPenalty: 20, foeActorId: 'foe-1' });
    expect(effectsOf(setup.actorRound, 'precision')).toEqual([
      expect.objectContaining({ value: 3, targetActorId: 'foe-1', data: { obPenalty: 20 } }),
    ]);
  });

  it('rear and front positions, and a position is required', async () => {
    expect((await precision({ combatTalent: { foeActorId: 'foe-1', position: 'rear' } })).modifiers['precision-position']).toBe(-50);
    expect((await precision({ combatTalent: { foeActorId: 'foe-1', position: 'front' } })).modifiers['precision-position']).toBe(-100);
    await expect(precision({ combatTalent: { foeActorId: 'foe-1' } })).rejects.toMatchObject({ code: 'err-precision-position-required' });
  });

  it('the next melee attack with the weapon of the talent gives up the OB and adds the value to the critical, and uses it', async () => {
    const { setup } = await precision();
    const effect = effectsOf(setup.actorRound, 'precision')[0];
    effect.targetActorId = 'defender-1';
    const ctx = createCombatPluginContext({
      skillId: 'melee-weapon@blade',
      sourceTraits: [trait('precision', 1, 'blade')],
      sourceEffects: [effect],
    });
    expect(await runPluginHook(CombatPrecisionPlugin, 'prepare', ctx)).toBe(true);
    expect(rollModifierValues(ctx).precision).toBe(-20);
    expect(ctx.attackPreparation!.modifiers.criticalModifiers).toEqual([expect.objectContaining({ key: 'precision', value: 3 })]);
    ctx.criticalRoll = 50;
    await runPluginHook(CombatCriticalAdjustmentPlugin, 'criticalRoll', ctx, 0);
    expect(ctx.criticalRoll).toBe(53);
    expect(ApplyAttackHandler.usedCombatTalentEffects(ctx.action, ctx.sourceActor!)).toEqual([effect.id]);
  });

  it('is not taken by an attack with another weapon, against another foe or at range', async () => {
    const { setup } = await precision();
    const effect = effectsOf(setup.actorRound, 'precision')[0];
    effect.targetActorId = 'defender-1';
    const base = { sourceTraits: [trait('precision', 1, 'blade')], sourceEffects: [effect] };
    const other = createCombatPluginContext({ ...base, skillId: 'melee-weapon@hafted' });
    expect(await runPluginHook(CombatPrecisionPlugin, 'prepare', other)).toBe(false);
    expect(ApplyAttackHandler.usedCombatTalentEffects(other.action, other.sourceActor!)).toEqual([]);
    const ranged = createCombatPluginContext({ ...base, skillId: 'melee-weapon@blade', attackType: 'ranged' });
    expect(await runPluginHook(CombatPrecisionPlugin, 'prepare', ranged)).toBe(false);
    effect.targetActorId = 'someone-else';
    const otherFoe = createCombatPluginContext({ ...base, skillId: 'melee-weapon@blade' });
    expect(await runPluginHook(CombatPrecisionPlugin, 'prepare', otherFoe)).toBe(false);
  });
});

describe('Luck talents on maneuvers (spec 076, §2.8)', () => {
  it('Unusual Luck: a natural 66 of an unopposed absolute maneuver is a success, not an unusual event', async () => {
    const { result, setup } = await resolve({
      traits: [trait('unusual-luck')],
      roll: new ManeuverRoll(90, 66),
      absolute: { result: 'failure', message: 'Unusual', effects: [] },
    });
    expect(setup.absolute).toHaveBeenCalledWith(expect.any(Number), 'lore', false);
    expect(result.maneuver!.result).toMatchObject({ result: 'success', rollTalent: 'unusual-luck', unusualEvent: undefined });
  });

  it('Unusual Luck keeps the absolute success the total reaches, and does not apply to an opposed maneuver', async () => {
    const lucky = await resolve({
      traits: [trait('unusual-luck')],
      roll: new ManeuverRoll(200, 66),
      absolute: { result: 'absolute-success', message: 'Wow', effects: [] },
    });
    expect(lucky.result.maneuver!.result).toMatchObject({ result: 'absolute-success', message: 'Wow', rollTalent: 'unusual-luck' });
    const opposed = await resolve({ traits: [trait('unusual-luck')], roll: new ManeuverRoll(90, 66), passiveTotal: 80 });
    expect(opposed.setup.absolute).toHaveBeenCalledWith(expect.any(Number), 'lore', true);
    expect(opposed.result.maneuver!.result).toMatchObject({ unusualEvent: true });
  });

  it('Absolute Ease of the category of the skill turns a success from its total into an absolute success', async () => {
    // Invented catalog: the skills without a profile in the factory are of the category `x`; old-lore of `beasts`.
    const ease = await resolve({ skillId: 'plain-skill', traits: [trait('absolute-ease', 2, 'x')], roll: new ManeuverRoll(100) });
    expect(ease.result.maneuver!.roll!.totalRoll).toBeGreaterThanOrEqual(126);
    expect(ease.result.maneuver!.result).toMatchObject({ result: 'absolute-success', rollTalent: 'absolute-ease' });
    const other = await resolve({ skillId: 'plain-skill', traits: [trait('absolute-ease', 2, 'lore')], roll: new ManeuverRoll(100) });
    expect(other.result.maneuver!.result).toMatchObject({ result: 'success' });
  });

  it('Absolute Disaster turns a failure up to its total into an absolute failure', async () => {
    const { result } = await resolve({
      skillId: 'plain-skill',
      traits: [trait('absolute-ease', 3, 'x'), trait('absolute-disaster', 1)],
      roll: new ManeuverRoll(5),
      absolute: { result: 'failure', message: 'No', effects: [] },
    });
    expect(result.maneuver!.result).toMatchObject({ result: 'absolute-failure', rollTalent: 'absolute-disaster' });
  });

  it('a natural 01 with Terrible Luck raises the alert; a natural 66 with Spasm gives the spasm of the rounds sent', async () => {
    const terrible = await resolve({ traits: [trait('terrible-luck')], roll: new ManeuverRoll(-40, 1) });
    expect(terrible.setup.actorRound.alerts).toEqual([expect.objectContaining({ type: 'terrible-luck' })]);
    expect(terrible.setup.actorRoundUpdate).toHaveBeenCalled();
    const spasm = await resolve({ traits: [trait('spasm')], roll: new ManeuverRoll(90, 66), spasmRounds: 3 });
    expect(effectsOf(spasm.setup.actorRound, 'spasm')).toEqual([expect.objectContaining({ rounds: 3, value: -50 })]);
  });

  it('checks the dice sent with the roll profile of the actor', async () => {
    await expect(resolve({ roll: new ManeuverRoll(125, 95, [95, 30]) })).rejects.toMatchObject({ code: 'err-roll-open-ended-invalid' });
    const lucky = await resolve({ traits: [trait('lucky', 1)], roll: new ManeuverRoll(125, 95, [95, 30]) });
    expect(lucky.result.maneuver!.roll!.roll).toBe(125);
  });
});
