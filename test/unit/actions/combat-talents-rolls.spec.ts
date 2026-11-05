import { describe, expect, it, vi } from 'vitest';
import { UpdateAttackRollCommand } from '../../../src/modules/actions/application/cqrs/commands/update-attack-roll.command.js';
import { UpdateAttackRollHandler } from '../../../src/modules/actions/application/cqrs/handlers/update-attack-roll.handler.js';
import type { ActionRepository } from '../../../src/modules/actions/application/ports/action-repository.port.js';
import {
  COMBAT_PLUGIN_LIST,
  CombatAttackRollResolverService,
  CombatMultipleAttacksPlugin,
  CombatPluginRegistryService,
  CombatProcessor,
} from '../../../src/modules/actions/application/services/combat/index.js';
import { applyNaturalRoll, spasmRoundsOf } from '../../../src/modules/actions/domain/services/roll-talents.js';
import type { Action } from '../../../src/modules/actions/domain/aggregates/action.js';
import { ActionAttackCalculated } from '../../../src/modules/actions/domain/value-objects/action-attack-calculated.vo.js';
import { AttackTableEntry } from '../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { absoluteEaseResult, rollProfileOf } from '../../../src/modules/actor-rounds/domain/value-objects/actor-roll-profile.vo.js';
import { ActorRoundAttack } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-attack.vo.js';
import { ActorRoundTrait } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { ActorRoundDto } from '../../../src/modules/actor-rounds/interfaces/http/dto/actor-round.dto.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import { checkOpenEndedDice, openEndedTotal } from '../../../src/modules/shared/domain/rolls/open-ended.js';
import { load } from '../actor-rounds/actor-round-test.factory.js';
import { createCombatPluginContext, rollModifierValues, runPluginHook } from './combat/combat-plugin-test.factory.js';

// Workspace spec 076, phase 3 (plan §2.8): the roll profile and the luck talents. Invented data only.

const trait = (traitId: string, tier = 1, specialization: string | null = null) => new ActorRoundTrait(traitId, tier, specialization);

describe('Roll profile (spec 076, §2.8)', () => {
  it('is the default one without talents', () => {
    expect(rollProfileOf([])).toEqual({ highFrom: 96, lowTo: 5, unusualLuck: false, terribleLuck: false, spasm: false, absoluteEase: [] });
  });

  it('opens 1 lower per tier of Lucky and Dramatic Luck, and Dramatic Luck widens the low end', () => {
    expect(rollProfileOf([trait('lucky', 2)])).toMatchObject({ highFrom: 94, lowTo: 5 });
    expect(rollProfileOf([trait('lucky', 2), trait('dramatic-luck', 1)])).toMatchObject({ highFrom: 93, lowTo: 6 });
  });

  it('reads Unusual Luck, Terrible Luck, Spasm and Absolute Ease (with Absolute Disaster) by category', () => {
    const profile = rollProfileOf([
      trait('unusual-luck'),
      trait('terrible-luck'),
      trait('spasm'),
      trait('absolute-ease', 2, 'athletic'),
      trait('absolute-ease', 1, 'lore'),
      trait('absolute-disaster', 1),
    ]);
    expect(profile).toMatchObject({ unusualLuck: true, terribleLuck: true, spasm: true });
    expect(profile.absoluteEase).toEqual([
      { categoryId: 'athletic', tier: 2, disaster: true },
      { categoryId: 'lore', tier: 1, disaster: true },
    ]);
  });

  it('is in the actor round DTO', () => {
    const round = load({ traits: [trait('lucky', 1)] });
    expect(round.rollProfile().highFrom).toBe(95);
    expect(ActorRoundDto.fromEntity(round).rollProfile).toMatchObject({ highFrom: 95, lowTo: 5 });
  });

  it('Absolute Ease makes a success absolute from 151, 126 or always; Absolute Disaster a failure up to 25, 50 or always', () => {
    const ease = (tier: number, disaster = false) => ({ categoryId: 'c', tier, disaster });
    expect(absoluteEaseResult(ease(1), 'success', 150)).toBeUndefined();
    expect(absoluteEaseResult(ease(1), 'success', 151)).toBe('absolute-success');
    expect(absoluteEaseResult(ease(2), 'success', 126)).toBe('absolute-success');
    expect(absoluteEaseResult(ease(3), 'success', 101)).toBe('absolute-success');
    expect(absoluteEaseResult(ease(1), 'failure', 10)).toBeUndefined();
    expect(absoluteEaseResult(ease(1, true), 'failure', 26)).toBeUndefined();
    expect(absoluteEaseResult(ease(1, true), 'failure', 25)).toBe('absolute-failure');
    expect(absoluteEaseResult(ease(2, true), 'failure', 50)).toBe('absolute-failure');
    expect(absoluteEaseResult(ease(3, true), 'failure', 70)).toBe('absolute-failure');
    expect(absoluteEaseResult(ease(3, true), 'partial-success', 90)).toBeUndefined();
    expect(absoluteEaseResult(undefined, 'success', 200)).toBeUndefined();
  });
});

describe('Open-ended dice chains (spec 076, §2.8)', () => {
  const lucky2 = rollProfileOf([trait('lucky', 2)]);

  it('adds or subtracts the dice of a chain that opens with the default thresholds', () => {
    expect(openEndedTotal([50], 'both')).toBe(50);
    expect(openEndedTotal([97, 98, 12], 'both')).toBe(207);
    expect(openEndedTotal([3, 40], 'both')).toBe(-37);
    expect(openEndedTotal([3], 'high')).toBe(3);
  });

  it('with Lucky II a 95 opens the roll and has to go on; without it, it does not', () => {
    expect(openEndedTotal([95, 30], 'both', lucky2)).toBe(125);
    expect(() => checkOpenEndedDice([95], 'both', lucky2)).toThrow(expect.objectContaining({ code: 'err-roll-open-ended-invalid' }));
    expect(() => checkOpenEndedDice([95, 30], 'both')).toThrow(expect.objectContaining({ code: 'err-roll-open-ended-invalid' }));
    // A 94 also goes on with Lucky II
    expect(openEndedTotal([96, 94, 2], 'both', lucky2)).toBe(192);
    expect(() => checkOpenEndedDice([96, 94], 'both', lucky2)).toThrow(expect.objectContaining({ code: 'err-roll-open-ended-invalid' }));
  });

  it('checks the total and the first die sent with the dice, and only when the dice are sent', () => {
    expect(() => checkOpenEndedDice([96, 35], 'high', undefined, { total: 131, unmodified: 96 })).not.toThrow();
    expect(() => checkOpenEndedDice([96, 35], 'high', undefined, { total: 130 })).toThrow(
      expect.objectContaining({ code: 'err-roll-open-ended-invalid' }),
    );
    expect(() => checkOpenEndedDice([96, 35], 'high', undefined, { unmodified: 35 })).toThrow(
      expect.objectContaining({ code: 'err-roll-open-ended-invalid' }),
    );
    expect(() => checkOpenEndedDice(undefined, 'high', undefined, { total: 5000 })).not.toThrow();
    expect(() => checkOpenEndedDice([101], 'high')).toThrow(expect.objectContaining({ code: 'err-roll-open-ended-invalid' }));
    expect(() => checkOpenEndedDice([], 'high')).toThrow(expect.objectContaining({ code: 'err-roll-open-ended-invalid' }));
  });

  it('a closed roll (critical, fumble) is one die; an attack does not open low', () => {
    expect(() => checkOpenEndedDice([98], 'none', undefined, { total: 98 })).not.toThrow();
    expect(() => checkOpenEndedDice([98, 20], 'none')).toThrow(expect.objectContaining({ code: 'err-roll-open-ended-invalid' }));
    expect(() => checkOpenEndedDice([2, 20], 'high')).toThrow(expect.objectContaining({ code: 'err-roll-open-ended-invalid' }));
  });
});

describe('Terrible Luck and Spasm on any roll (spec 076, decision B10, P5)', () => {
  const origin = { kind: 'attack' as const, actionId: 'action-1', attackName: 'mainHand' };

  it('a natural 01 with Terrible Luck raises one terrible-luck alert per roll', () => {
    const round = load({ traits: [trait('terrible-luck')] });
    expect(applyNaturalRoll(round, 1, origin)).toEqual({ terribleLuck: true, spasm: false });
    expect(applyNaturalRoll(round, 1, origin).terribleLuck).toBe(false);
    expect(applyNaturalRoll(round, 1, { kind: 'maneuver', actionId: 'action-2' }).terribleLuck).toBe(true);
    expect(round.alerts.map(alert => alert.type)).toEqual(['terrible-luck', 'terrible-luck']);
    expect(round.alerts[0].getModifierText('origin')).toBe('attack');
    // The game master narrates it and dismisses it
    round.resolveAlert(round.alerts[0].id);
    expect(round.alerts[0].status).toBe('resolved');
  });

  it('a natural 66 with Spasm gives a spasm of the rounds sent, or of a d10 rolled here, once per roll', () => {
    const round = load({ traits: [trait('spasm')] });
    expect(applyNaturalRoll(round, 66, origin, { spasmRounds: 4 }).spasm).toBe(true);
    expect(round.effects).toEqual([expect.objectContaining({ status: 'spasm', value: -50, rounds: 4 })]);
    expect(applyNaturalRoll(round, 66, origin, { spasmRounds: 7 }).spasm).toBe(false);
    expect(round.effects[0].rounds).toBe(4);

    const other = load({ traits: [trait('spasm')] });
    applyNaturalRoll(other, 66, { kind: 'spell', actionId: 'cast-1' }, { random: () => 0.55 });
    expect(other.effects[0].rounds).toBe(6);
    expect(() => spasmRoundsOf(11)).toThrow(expect.objectContaining({ code: 'err-spasm-rounds-invalid' }));
  });

  it('does nothing without the talents, on other rolls, or without the natural roll', () => {
    const plain = load();
    expect(applyNaturalRoll(plain, 1, origin)).toEqual({ terribleLuck: false, spasm: false });
    expect(applyNaturalRoll(plain, 66, origin)).toEqual({ terribleLuck: false, spasm: false });
    const talented = load({ traits: [trait('terrible-luck'), trait('spasm')] });
    expect(applyNaturalRoll(talented, 2, origin)).toEqual({ terribleLuck: false, spasm: false });
    expect(applyNaturalRoll(talented, undefined, origin)).toEqual({ terribleLuck: false, spasm: false });
    expect(talented.alerts).toEqual([]);
    expect(talented.effects).toEqual([]);
  });
});

describe('Attack roll: dice of the roll profile and luck talents (spec 076, §2.8)', () => {
  const setup = (sourceTraits: ActorRoundTrait[]) => {
    const ctx = createCombatPluginContext({ sourceTraits, skillId: 'melee-weapon@blade' });
    ctx.attack!.calculated = new ActionAttackCalculated([], 60, undefined, undefined, []);
    ctx.sourceActor!.injuries = [];
    const actorRoundUpdate = vi.fn(() => Promise.resolve());
    const handler = new UpdateAttackRollHandler(
      {
        findById: vi.fn(() => Promise.resolve({ id: 'game-1', round: 1, phase: 'phase_2', checkNotFinished: () => undefined })),
      } as unknown as GameRepository,
      {
        findById: vi.fn(() => Promise.resolve(ctx.action)),
        update: vi.fn((updated: Action) => Promise.resolve(updated)),
      } as unknown as ActionRepository,
      {
        findByActorIdAndRound: vi.fn((_g: string, actorId: string) =>
          Promise.resolve(ctx.actors!.find(actor => actor.actorId === actorId)),
        ),
        update: actorRoundUpdate,
      } as unknown as ActorRoundRepository,
      { publish: vi.fn(() => Promise.resolve()) },
      new CombatAttackRollResolverService(new CombatProcessor(new CombatPluginRegistryService(COMBAT_PLUGIN_LIST)), {
        lookup: vi.fn(() => Promise.resolve(new AttackTableEntry('0', 0, undefined, undefined))),
      }),
    );
    return { ctx, handler, actorRoundUpdate };
  };

  it('rejects a chain that the attacker’s profile does not open, and takes the one Lucky opens', async () => {
    const plain = setup([]);
    await expect(
      plain.handler.execute(new UpdateAttackRollCommand('action-1', 'Longsword', 125, 'user', [], 95, [95, 30])),
    ).rejects.toMatchObject({
      code: 'err-roll-open-ended-invalid',
    });
    const lucky = setup([trait('lucky', 1)]);
    await expect(
      lucky.handler.execute(new UpdateAttackRollCommand('action-1', 'Longsword', 125, 'user', [], 95, [95, 30])),
    ).resolves.toBeDefined();
  });

  it('a natural 01 of an attacker with Terrible Luck raises the alert', async () => {
    const { ctx, handler, actorRoundUpdate } = setup([trait('terrible-luck')]);
    ctx.sourceActor!.reopenWounds = () => [];
    await handler.execute(new UpdateAttackRollCommand('action-1', 'Longsword', 1, 'user', [], 1, [1]));
    expect(ctx.sourceActor!.alerts).toEqual([expect.objectContaining({ type: 'terrible-luck' })]);
    expect(actorRoundUpdate).toHaveBeenCalledWith(ctx.sourceActor);
  });
});

describe('Unarmed attacks (spec 076, A8)', () => {
  it('count as natural weapons for the off-hand bonus of a kata', async () => {
    const kick = new ActorRoundAttack(
      'kick',
      [],
      40,
      40,
      'melee',
      't',
      'f',
      0,
      3,
      false,
      null,
      null,
      false,
      'unarmed',
      'unarmed-st@strikes',
    );
    const ctx = createCombatPluginContext({ attackNumber: 2, weaponCategory: 'unarmed', otherAttacks: [kick] });
    await runPluginHook(CombatMultipleAttacksPlugin, 'prepare', ctx);
    expect(rollModifierValues(ctx)).toMatchObject({ 'attack-number': -75, 'light-weapon': 30 });
  });
});
