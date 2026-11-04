import type { CommandBus } from '@nestjs/cqrs';
import { describe, expect, it, vi } from 'vitest';
import { CompleteActionCommand } from '../../../src/modules/actions/application/cqrs/commands/complete-action.command.js';
import {
  CreateActionCommand,
  type CreateActionCommandAim,
} from '../../../src/modules/actions/application/cqrs/commands/create-action.command.js';
import { ApplyAttackHandler } from '../../../src/modules/actions/application/cqrs/handlers/apply-attack.handler.js';
import { CompleteActionHandler } from '../../../src/modules/actions/application/cqrs/handlers/complete-action.handler.js';
import { CreateActionHandler } from '../../../src/modules/actions/application/cqrs/handlers/create-action.handler.js';
import type { ActionRepository } from '../../../src/modules/actions/application/ports/action-repository.port.js';
import type { MedicalActionService } from '../../../src/modules/actions/application/services/medical/medical-action.service.js';
import type { SpellCastingService } from '../../../src/modules/actions/application/services/spell/spell-casting.service.js';
import { Action } from '../../../src/modules/actions/domain/aggregates/action.js';
import { accumulateAiming, aimingAfterRangedAttacks, aimingMatches } from '../../../src/modules/actions/domain/services/aiming.js';
import type { ActionType } from '../../../src/modules/actions/domain/value-objects/action-type.vo.js';
import { ActionApProfile } from '../../../src/modules/actions/domain/value-objects/action-ap-profile.vo.js';
import type { HealingTablesPort } from '../../../src/modules/actor-rounds/application/ports/healing-tables.port.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { MedicalAbortService } from '../../../src/modules/actor-rounds/application/services/medical-abort.service.js';
import type { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundAttack } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-attack.vo.js';
import { ActorRoundTrait } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import type { CharacterPort } from '../../../src/modules/strategic/application/ports/character.port.js';
import { load } from '../actor-rounds/actor-round-test.factory.js';
import { sheetsOf } from '../support/actor-sheets.js';
import { createCombatPluginContext } from './combat/combat-plugin-test.factory.js';

// Workspace spec 076, phase 3 (plan §2.7): Sharpshooter aiming. Invented data only.

const BOW_SKILL = 'ranged-weapon@bow';

const bow = () => {
  const attack = new ActorRoundAttack('bow', [], 50, 50, 'ranged', 't', 'f', 0, 3, false, null, null, false, 'standard', BOW_SKILL);
  attack.itemId = 'bow-1';
  return attack;
};

const sword = () => {
  const attack = new ActorRoundAttack(
    'mainHand',
    [],
    50,
    50,
    'melee',
    't',
    'f',
    0,
    3,
    false,
    1,
    null,
    false,
    'standard',
    'melee-weapon@blade',
  );
  attack.itemId = 'sword-1';
  return attack;
};

const archer = (tier = 2, specialization = 'bow') => {
  const round = load({ traits: [new ActorRoundTrait('sharpshooter', tier, specialization)], attacks: [bow(), sword()] });
  return round;
};

const aimingOf = (round: ActorRound) => round.effects.filter(effect => effect.status === 'aiming');

describe('Aiming (spec 076, decision B6)', () => {
  it('takes a full round', () => {
    expect(ActionApProfile.forAction('aim')).toMatchObject({ min: 4, max: 4, penaltyPerMissing: 0 });
  });

  it('adds 5 per round at the same foe with the same weapon, up to 5 per tier, and starts again on a change', () => {
    const round = archer(2);
    const aim = { targetActorId: 'foe-1', itemId: 'bow-1' };
    accumulateAiming(round, aim);
    expect(aimingOf(round)).toEqual([expect.objectContaining({ value: 5, targetActorId: 'foe-1', data: { itemId: 'bow-1' } })]);
    accumulateAiming(round, aim);
    expect(aimingOf(round).map(effect => effect.value)).toEqual([10]);
    accumulateAiming(round, aim);
    expect(aimingOf(round).map(effect => effect.value)).toEqual([10]);
    accumulateAiming(round, { targetActorId: 'foe-2', itemId: 'bow-1' });
    expect(aimingOf(round)).toEqual([expect.objectContaining({ value: 5, targetActorId: 'foe-2' })]);
  });

  it.each(['melee_attack', 'maneuver', 'movement', 'draw_and_load', 'cast_spell', 'dodge', 'stand_up', 'medical', 'use_item', 'other'])(
    'is lost when a %s is declared, free or instant actions too',
    actionType => {
      const round = archer();
      accumulateAiming(round, { targetActorId: 'foe-1', itemId: 'bow-1' });
      expect(CreateActionHandler.loseAiming(actionType as ActionType, round)).toBe(true);
      expect(aimingOf(round)).toEqual([]);
    },
  );

  it('is kept when aiming again or declaring a ranged attack, whose foe and weapon are only known when applied', () => {
    const round = archer();
    accumulateAiming(round, { targetActorId: 'foe-1', itemId: 'bow-1' });
    expect(CreateActionHandler.loseAiming('ranged_attack', round)).toBe(false);
    expect(CreateActionHandler.loseAiming('aim', round)).toBe(false);
    expect(aimingOf(round)).toHaveLength(1);
  });

  const shot = (attackName: string, targetId: string, type: 'ranged' | 'melee' = 'ranged') => {
    const ctx = createCombatPluginContext({ attackType: type });
    const attack = ctx.action.attacks![0];
    attack.attackName = attackName;
    attack.modifiers.targetId = targetId;
    return Object.assign(ctx.action, { actionType: type === 'ranged' ? 'ranged_attack' : 'melee_attack', attacks: [attack] });
  };

  it('is used up by a ranged attack with the aimed item against the aimed foe', () => {
    const round = archer();
    const aiming = accumulateAiming(round, { targetActorId: 'foe-1', itemId: 'bow-1' });
    expect(aimingAfterRangedAttacks(round, [{ targetId: 'foe-1', itemId: 'bow-1' }])).toEqual({ used: [aiming.id], lost: [] });
    expect(ApplyAttackHandler.usedCombatTalentEffects(shot('bow', 'foe-1'), round)).toEqual([aiming.id]);
  });

  it('is not used by a ranged attack against another foe or with another weapon, but lost all the same', () => {
    const round = archer();
    const aiming = accumulateAiming(round, { targetActorId: 'foe-1', itemId: 'bow-1' });
    expect(aimingAfterRangedAttacks(round, [{ targetId: 'foe-2', itemId: 'bow-1' }])).toEqual({ used: [], lost: [aiming.id] });
    expect(aimingAfterRangedAttacks(round, [{ targetId: 'foe-1', itemId: 'sling-1' }])).toEqual({ used: [], lost: [aiming.id] });
    expect(ApplyAttackHandler.usedCombatTalentEffects(shot('bow', 'foe-2'), round)).toEqual([aiming.id]);
    expect(ApplyAttackHandler.usedCombatTalentEffects(shot('mainHand', 'foe-1'), round)).toEqual([aiming.id]);
  });

  it('only matches the aimed foe and item, and nothing when there are no ranged attacks', () => {
    const round = archer();
    const aiming = accumulateAiming(round, { targetActorId: 'foe-1', itemId: 'bow-1' });
    expect(aimingMatches(aiming, 'foe-1', 'bow-1')).toBe(true);
    expect(aimingMatches(aiming, 'foe-2', 'bow-1')).toBe(false);
    expect(aimingMatches(aiming, 'foe-1', 'sword-1')).toBe(false);
    expect(aimingMatches(aiming, undefined, 'bow-1')).toBe(false);
    expect(aimingAfterRangedAttacks(round, [])).toEqual({ used: [], lost: [] });
    expect(ApplyAttackHandler.usedCombatTalentEffects(shot('mainHand', 'foe-1', 'melee'), round)).toEqual([]);
  });
});

describe('Declaring and completing an aim action (spec 076, decision B6)', () => {
  const declare = async (round: ActorRound, aim: CreateActionCommandAim | undefined, freeAction = false) => {
    const foe = load();
    Object.assign(foe, { actorId: 'foe-1' });
    const game = { id: 'game-1', name: 'g', round: 1, phase: 'phase_1', getActionPhase: () => 1 };
    const handler = new CreateActionHandler(
      { findById: vi.fn(() => Promise.resolve(game)) } as unknown as GameRepository,
      {
        findByRsql: vi.fn(() => Promise.resolve({ content: [round] })),
        findByActorIdAndRound: vi.fn((_g: string, actorId: string) => Promise.resolve(actorId === 'foe-1' ? foe : null)),
        update: vi.fn(() => Promise.resolve()),
      } as unknown as ActorRoundRepository,
      {
        findByRsql: vi.fn(() => Promise.resolve({ content: [] })),
        save: vi.fn((saved: Action) => Promise.resolve(saved)),
        update: vi.fn((updated: Action) => Promise.resolve(updated)),
      } as unknown as ActionRepository,
      { publish: vi.fn(() => Promise.resolve()) },
      { findSkill: vi.fn(), findManeuverModifiers: vi.fn() },
      sheetsOf({ findById: vi.fn(() => Promise.resolve(null)) } as unknown as CharacterPort),
      {} as SpellCastingService,
      {} as HealingTablesPort,
      {} as MedicalActionService,
      new MedicalAbortService({} as ActorRoundRepository),
    );
    const command = new CreateActionCommand(
      'game-1',
      'actor-1',
      'aim',
      freeAction,
      1,
      undefined,
      '',
      'user',
      [],
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      undefined,
      aim,
    );
    return handler.execute(command);
  };

  it('aims a ranged weapon of the Sharpshooter specialization at a foe of the round', async () => {
    const created = await declare(archer(), { targetActorId: 'foe-1', itemId: 'bow-1' });
    expect(created.aim).toEqual({ targetActorId: 'foe-1', itemId: 'bow-1' });
    expect(created.actionType).toBe('aim');
  });

  it('rejects a melee weapon, a weapon of another specialization, no talent, no foe and an instantaneous aim', async () => {
    await expect(declare(archer(), { targetActorId: 'foe-1', itemId: 'sword-1' })).rejects.toMatchObject({
      code: 'err-aim-not-allowed',
      details: { reason: 'not-ranged' },
    });
    await expect(declare(archer(2, 'crossbow'), { targetActorId: 'foe-1', itemId: 'bow-1' })).rejects.toMatchObject({
      code: 'err-aim-not-allowed',
      details: { reason: 'no-sharpshooter' },
    });
    await expect(declare(load({ attacks: [bow()] }), { targetActorId: 'foe-1', itemId: 'bow-1' })).rejects.toMatchObject({
      code: 'err-aim-not-allowed',
    });
    await expect(declare(archer(), undefined)).rejects.toMatchObject({ code: 'err-aim-not-allowed', details: { reason: 'missing' } });
    await expect(declare(archer(), { targetActorId: 'nobody', itemId: 'bow-1' })).rejects.toMatchObject({ code: 'err-target-not-found' });
    await expect(declare(archer(), { targetActorId: 'foe-1', itemId: 'bow-1' }, true)).rejects.toMatchObject({
      code: 'err-action-free-not-allowed',
    });
  });

  it('completing it with the full round adds to the aiming', async () => {
    const round = archer();
    const action = Action.fromProps({
      id: 'aim-1',
      gameId: 'game-1',
      actorId: 'actor-1',
      round: 1,
      actionType: 'aim',
      freeAction: false,
      phaseStart: 1,
      phaseEnd: null,
      status: 'declared',
      actionPoints: null,
      movement: null,
      attacks: null,
      parries: null,
      maneuver: null,
      fatigue: null,
      description: null,
      owner: 'owner',
      createdAt: new Date(),
      updatedAt: null,
      aim: { targetActorId: 'foe-1', itemId: 'bow-1' },
    });
    const update = vi.fn(() => Promise.resolve());
    const handler = new CompleteActionHandler(
      { findById: vi.fn(() => Promise.resolve({ id: 'game-1', getActionPhase: () => 4 })) } as unknown as GameRepository,
      { findByActorIdAndRound: vi.fn(() => Promise.resolve(round)), update } as unknown as ActorRoundRepository,
      {
        findById: vi.fn(() => Promise.resolve(action)),
        update: vi.fn((updated: Action) => Promise.resolve(updated)),
      } as unknown as ActionRepository,
      { publish: vi.fn(() => Promise.resolve()) },
      sheetsOf({ findById: vi.fn(() => Promise.resolve(null)) } as unknown as CharacterPort),
      { execute: vi.fn() } as unknown as CommandBus,
    );
    const completed = await handler.execute(new CompleteActionCommand('aim-1', undefined, 'user', []));
    expect(completed.status).toBe('completed');
    expect(aimingOf(round)).toEqual([expect.objectContaining({ value: 5, targetActorId: 'foe-1' })]);
    expect(update).toHaveBeenCalledWith(round);
  });
});
