import { describe, expect, it } from 'vitest';
import {
  ManeuverRoll,
  ResolveManeuverCommand,
  ResolveManeuverRequest,
} from '../../../../src/modules/actions/application/cqrs/commands/resolve-maneuver.command.js';
import { ResolveManeuverHandler } from '../../../../src/modules/actions/application/cqrs/handlers/resolve-maneuver.handler.js';
import { ResolveManeuverDto } from '../../../../src/modules/actions/interfaces/http/dto/resolve-maneuver.dto.js';
import { breakdown, type ManeuverSetup, setupManeuver } from './maneuver-test.factory.js';
import { load } from '../../actor-rounds/actor-round-test.factory.js';

const handlerFor = (setup: ReturnType<typeof setupManeuver>) =>
  new ResolveManeuverHandler(
    setup.gameRepository,
    setup.actorRoundRepository,
    setup.actionRepository,
    setup.eventBus,
    setup.maneuverPort,
    setup.contextService,
    setup.psychologyTables,
  );

const request = (overrides: Partial<ResolveManeuverRequest> = {}): ResolveManeuverRequest =>
  Object.assign(new ResolveManeuverRequest('m', {}), overrides);

const resolve = async (options: ManeuverSetup, req: Partial<ResolveManeuverRequest> = {}, roll = 50, unmodified?: number) => {
  const setup = setupManeuver(options);
  const result = await handlerFor(setup).execute(
    new ResolveManeuverCommand('action-1', request(req), new ManeuverRoll(roll, unmodified), 'user-1', []),
  );
  return { setup, result, modifiers: breakdown(result.maneuver!.roll!.modifiers) };
};

describe('ResolveManeuverHandler', () => {
  it('sums roll, skill, difficulty, base modifiers and custom bonus', async () => {
    const { result, modifiers, setup } = await resolve(
      { skillId: 'wall-scaling', maneuverPenalty: -30, encumbrancePenalty: -10, penalties: [['critical', -5]] },
      { difficulty: 'h', customBonus: 7 },
      80,
    );
    expect(modifiers).toEqual({
      roll: 80,
      'wall-scaling': 40,
      difficulty: -10,
      'penalty-injury': -5,
      'armor-maneuver': -30,
      encumbrance: -10,
      'custom-bonus': 7,
    });
    expect(result.maneuver!.roll!.totalRoll).toBe(72);
    expect(result.status).toBe('completed');
    expect(result.actionPoints).toBe(1);
    expect(setup.publish).toHaveBeenCalled();
  });

  it('criterion 1: an absolute maneuver uses the table of its skill profile and keeps the effects', async () => {
    const effects = [{ status: 'retryBonus', value: 10 }];
    const { setup, result } = await resolve({
      skillId: 'wall-scaling',
      absolute: { result: 'partial-success', message: 'Almost', effects },
    });
    expect(setup.absolute).toHaveBeenCalledWith(90, 'gymnastic', false);
    expect(result.maneuver!.result).toMatchObject({ result: 'partial-success', message: 'Almost', effects });
  });

  it('criterion 1: a percent maneuver uses the percent table and stores the percent', async () => {
    const { setup, result } = await resolve({
      skillId: 'desk-work',
      percent: { percent: 60, critical: null, message: 'Completed at 60%' },
    });
    expect(setup.percent).toHaveBeenCalledWith(90);
    expect(setup.absolute).not.toHaveBeenCalled();
    expect(result.maneuver!.result).toMatchObject({ percent: 60, completed: false });
    expect(result.maneuver!.progress).toBe(60);
  });

  it('criterion 2: armor and encumbrance only reach maneuvers needing freedom of movement', async () => {
    const climb = await resolve({ skillId: 'wall-scaling', maneuverPenalty: -30, encumbrancePenalty: -10 });
    expect(climb.modifiers).toMatchObject({ 'armor-maneuver': -30, encumbrance: -10 });
    const lore = await resolve({ skillId: 'old-lore', maneuverPenalty: -30, encumbrancePenalty: -10 });
    expect(lore.modifiers['armor-maneuver']).toBeUndefined();
    expect(lore.modifiers.encumbrance).toBeUndefined();
  });

  it('criterion 3: a maneuver after jogging this round takes -50 for the pace', async () => {
    const { modifiers } = await resolve({ pace: 'jog' });
    expect(modifiers.pace).toBe(-50);
  });

  it('criterion 4: a 2 AP maneuver with a 1-4 AP range takes -50', async () => {
    const { modifiers, result } = await resolve({ skillId: 'quick-fix', phaseStart: 1, phase: 'phase_2' });
    expect(result.actionPoints).toBe(2);
    expect(modifiers['action-points']).toBe(-50);
  });

  it('criterion 5: light applies where the skill requires it, doubled; a skill without light ignores it', async () => {
    const dark = await resolve({ skillId: 'keen-eye', freeAction: true }, { light: 'dark' });
    expect(dark.modifiers.light).toBe(-50);
    expect(dark.modifiers['action-points']).toBe(-50);
    expect(dark.result.maneuver!.modifiers.lightModifier).toBe('required');
    const lore = await resolve({ skillId: 'old-lore' }, { light: 'dark' });
    expect(lore.modifiers.light).toBeUndefined();
  });

  it('hiding light: darkness helps whoever hides, with the helpful value and the opposite sign', async () => {
    const dark = await resolve({ skillId: 'shadow-hiding' }, { light: 'dark' });
    expect(dark.modifiers.light).toBe(25);
    expect(dark.result.maneuver!.modifiers.lightModifier).toBe('hiding');
  });

  it('criterion 6: catalog selections add the catalog values', async () => {
    const { modifiers, result } = await resolve(
      { skillId: 'creature-taming' },
      { selections: { 'creature-temper': 'tame', 'creature-herd': true, 'creature-kin': false, 'creature-habitat': 2 } },
    );
    expect(modifiers).toMatchObject({ 'creature-temper': 15, 'creature-herd': -15, 'creature-habitat': -14 });
    expect(modifiers['creature-kin']).toBeUndefined();
    expect(result.maneuver!.modifiers.selections).toEqual({
      'creature-temper': 'tame',
      'creature-herd': true,
      'creature-kin': false,
      'creature-habitat': 2,
    });
  });

  it('criterion 7: an invented selection is an unknown modifier', async () => {
    await expect(resolve({ skillId: 'creature-taming' }, { selections: { 'made-up': true } })).rejects.toMatchObject({
      code: 'err-maneuver-unknown-modifier',
    });
  });

  it.each([
    [{ 'creature-temper': 'unknown-option' }],
    [{ 'creature-temper': true }],
    [{ 'creature-herd': 'yes' }],
    [{ 'creature-habitat': 4 }],
    [{ 'creature-habitat': -1 }],
  ])('rejects an invalid value %p', async selections => {
    await expect(resolve({ skillId: 'creature-taming' }, { selections })).rejects.toMatchObject({
      code: 'err-maneuver-invalid-modifier',
    });
  });

  it('criterion 8: a conflicting maneuver against a passive total of 134 adds -34', async () => {
    const { modifiers } = await resolve({}, { passiveTotal: 134 });
    expect(modifiers.conflict).toBe(-34);
  });

  it('criterion 9: an unmodified 66 asks core for the unusual event', async () => {
    const { setup, result } = await resolve({}, {}, 120, 66);
    expect(setup.absolute).toHaveBeenCalledWith(160, 'lore', true);
    expect(result.maneuver!.result!.unusualEvent).toBe(true);
  });

  it('M12: a total of 0 is a valid roll', async () => {
    const { setup } = await resolve({ skills: [] }, { difficulty: 'm', customBonus: 25 }, 0);
    expect(setup.absolute).toHaveBeenCalledWith(0, 'lore', false);
  });

  it('rolls with another skill and specialization when the request changes it', async () => {
    const { modifiers, result, setup } = await resolve(
      { skills: [{ skillId: 'wall-scaling', specialization: 'cliffs', totalBonus: 55, ranks: 7 }] },
      { skillId: 'wall-scaling', specialization: 'cliffs' },
    );
    expect(modifiers['wall-scaling']).toBe(55);
    expect(result.maneuver!.modifiers).toMatchObject({ skillId: 'wall-scaling', specialization: 'cliffs' });
    expect(setup.findSkill).toHaveBeenCalledWith('wall-scaling');
  });

  it('spec 052: every modifier of the breakdown carries its group and, when the books give one, its rule', async () => {
    const { result } = await resolve(
      { skillId: 'wall-scaling', maneuverPenalty: -30, encumbrancePenalty: -10, pace: 'walk' },
      { difficulty: 'h', customBonus: 7 },
    );
    const byKey = Object.fromEntries(result.maneuver!.roll!.modifiers.map(m => [m.key, m]));
    expect(byKey['wall-scaling']).toMatchObject({
      group: 'skill',
      source: 'skill',
      rule: 'Table 3-0b',
      params: { ranks: expect.any(Number) as number },
    });
    expect(byKey.difficulty).toMatchObject({ group: 'situation', rule: '§5.1', params: { difficulty: 'h' } });
    expect(byKey['armor-maneuver']).toMatchObject({ group: 'penalty', rule: '§7.2' });
    expect(byKey.encumbrance).toMatchObject({ group: 'penalty', rule: '§5.4' });
    expect(byKey.pace).toMatchObject({ group: 'situation', rule: 'Table 5-3', params: { pace: 'walk' } });
    expect(byKey['custom-bonus']).toMatchObject({ group: 'situation', source: 'custom' });
    expect(result.maneuver!.roll!.modifiers.filter(m => m.key !== 'roll').every(m => !!m.group)).toBe(true);
  });

  it('spec 052: an unskilled actor rolls with an unskilled -25 that names the skill', async () => {
    const { modifiers, result } = await resolve({ skills: [] }, { skillId: 'wall-scaling', specialization: 'trees' });
    expect(modifiers.unskilled).toBe(-25);
    expect(modifiers['wall-scaling']).toBeUndefined();
    expect(result.maneuver!.roll!.modifiers.find(m => m.key === 'unskilled')).toMatchObject({
      group: 'skill',
      params: { skill: 'wall-scaling', specialization: 'trees' },
    });
  });

  it('spec 052: a light chosen for a skill that does not use it is a rule not applied', async () => {
    const lore = await resolve({ skillId: 'old-lore' }, { light: 'dark' });
    expect(lore.result.maneuver!.roll!.skipped).toEqual([
      expect.objectContaining({ source: 'light', reason: 'light-not-needed', rule: 'Table 15-7', params: { light: 'dark' } }),
    ]);
  });

  it('reads the core catalog once per request', async () => {
    const { setup } = await resolve({ skillId: 'creature-taming' });
    expect(setup.findSkill).toHaveBeenCalledTimes(1);
    expect(setup.findManeuverModifiers).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown difficulty', async () => {
    await expect(resolve({}, { difficulty: 'zz' as never })).rejects.toMatchObject({ code: 'err-maneuver-invalid-modifier' });
  });

  describe('percent maneuvers across rounds', () => {
    it('criterion 12: 60 % inherited plus 50 % completes the task at 110 %', async () => {
      const { result } = await resolve({
        skillId: 'desk-work',
        maneuver: { progress: 60, continuesActionId: 'previous' },
        percent: { percent: 50, critical: null, message: 'Completed at 50%' },
      });
      expect(result.maneuver!.progress).toBe(110);
      expect(result.maneuver!.result).toMatchObject({ percent: 50, completed: true });
    });

    it('a critical adds nothing; on a maneuver needing freedom of movement it raises a critical alert', async () => {
      const { result, setup } = await resolve({
        skillId: 'long-work',
        maneuver: { progress: 40 },
        percent: { percent: 0, critical: 'B', message: 'Received critical B' },
      });
      expect(result.maneuver!.progress).toBe(40);
      expect(result.maneuver!.result).toMatchObject({ critical: 'B', completed: false });
      expect(setup.actorRound.alerts).toEqual([expect.objectContaining({ type: 'critical' })]);
      expect(setup.actorRoundUpdate).toHaveBeenCalled();
    });

    it('a critical of a maneuver without movement raises no alert', async () => {
      const { setup } = await resolve({ skillId: 'desk-work', percent: { percent: 0, critical: 'A', message: 'Received critical A' } });
      expect(setup.actorRound.alerts).toEqual([]);
      expect(setup.actorRoundUpdate).not.toHaveBeenCalled();
    });

    it('a percent maneuver offers no conflict', async () => {
      await expect(resolve({ skillId: 'desk-work' }, { passiveTotal: 100 })).rejects.toMatchObject({
        code: 'err-maneuver-invalid-modifier',
      });
    });
  });

  it('criterion 10: after a failed endurance roll, maneuvers take the fatigue penalty', async () => {
    const { modifiers } = await resolve({ fatigue: 10 });
    expect(modifiers['penalty-fatigue']).toBe(-10);
  });

  it('rejects a missing roll and a completed action', async () => {
    const setup = setupManeuver();
    const handler = handlerFor(setup);
    await expect(
      handler.execute(new ResolveManeuverCommand('action-1', request(), new ManeuverRoll(undefined as never), 'u', [])),
    ).rejects.toThrow('Required roll value');
    setup.action.status = 'completed';
    await expect(handler.execute(new ResolveManeuverCommand('action-1', request(), new ManeuverRoll(50), 'u', []))).rejects.toThrow(
      'Action is already completed',
    );
  });
});

describe('ResolveManeuverDto', () => {
  it('reads the legacy modifiers body', () => {
    const dto = Object.assign(new ResolveManeuverDto(), {
      modifiers: { difficulty: 'h', light: 'dark', lightModifier: 'helpful', armorModifier: true, customBonus: 5 },
      roll: { roll: 70 },
    });
    const command = ResolveManeuverDto.toCommand('action-1', dto, 'user-1', []);
    expect(command.request).toMatchObject({ difficulty: 'h', light: 'dark', lightUsage: 'helpful', customBonus: 5, selections: {} });
    expect(command.roll).toEqual({ roll: 70, unmodified: undefined });
  });

  it('prefers the new fields over the legacy ones', () => {
    const dto = Object.assign(new ResolveManeuverDto(), {
      difficulty: 'e',
      selections: { a: true },
      passiveTotal: 120,
      modifiers: { difficulty: 'h' },
      roll: { roll: 70, unmodified: 66 },
    });
    const command = ResolveManeuverDto.toCommand('action-1', dto, 'user-1', []);
    expect(command.request).toMatchObject({ difficulty: 'e', selections: { a: true }, passiveTotal: 120 });
    expect(command.roll.unmodified).toBe(66);
  });

  it('a legacy light usage applies when the skill profile does not use light', async () => {
    const { modifiers } = await resolve({ skillId: 'old-lore' }, { light: 'dark', lightUsage: 'helpful' });
    expect(modifiers.light).toBe(-25);
  });
});

describe('social maneuvers (workspace spec 022, decisions 10-12)', () => {
  const seller = () => {
    const actorRound = Object.assign(load({ penalties: [['critical', -5]] }), {
      actorId: 'seller',
      characterId: 'seller',
      actorName: 'Bree merchant',
    });
    const character = { id: 'seller', skills: [{ skillId: 'trading', specialization: null, totalBonus: 30, ranks: 3 }] } as never;
    return { actorRound, character };
  };

  it('Trading is an opposed percent maneuver whose result is a price, without critical nor progress (D2p)', async () => {
    const percent = { percent: 70, critical: 'B', message: 'Seventy' };
    const { result, modifiers } = await resolve(
      { skillId: 'trading', skills: [{ skillId: 'trading', specialization: null, totalBonus: 40 }], percent, targets: [seller()] },
      { passive: { targetActorId: 'seller', roll: 60 } },
      80,
    );
    // 60 + 30 - 5 = 85 passive total: the conflict modifier is 100 - 85.
    expect(modifiers.conflict).toBe(15);
    expect(result.maneuver!.result).toMatchObject({ percent: 70, price: 130, critical: null, completed: true });
    expect(result.maneuver!.progress ?? 0).toBe(0);
    expect(result.maneuver!.modifiers).toMatchObject({ passiveTotal: 85, targetActorId: 'seller', passiveSkillId: 'trading' });
  });

  it('keeps the price between 50% and 200%', async () => {
    const high = await resolve({ skillId: 'trading', percent: { percent: 175, critical: null, message: '' } }, {}, 200);
    const low = await resolve({ skillId: 'trading', percent: { percent: 0, critical: 'E', message: '' } }, {}, -200);
    expect([high.result.maneuver!.result!.price, low.result.maneuver!.result!.price]).toEqual([50, 200]);
  });

  it('Leadership reads its result on the morale table of core (D1p)', async () => {
    const { result, setup } = await resolve({ skillId: 'leadership' }, {}, 80);
    expect(setup.absolute).not.toHaveBeenCalled();
    expect(result.maneuver!.result).toMatchObject({ result: 'success', outcome: 'obeys' });
    const inspired = await resolve({ skillId: 'leadership' }, {}, 130);
    expect(inspired.result.maneuver!.result).toMatchObject({ outcome: 'inspired', moraleModifier: 4, moraleModifierDays: 20 });
    const odd = await resolve({ skillId: 'leadership' }, {}, 30, 66);
    expect(odd.result.maneuver!.result).toMatchObject({ result: 'failure', outcome: 'misunderstands-order', unusualEvent: true });
  });

  it('an Influence maneuver against an actor takes its Social Awareness from its sheet (D5p)', async () => {
    const target = Object.assign(load(), { actorId: 'guard', characterId: 'guard', actorName: 'Guard' });
    const sheet = { id: 'guard', skills: [{ skillId: 'social-awareness', specialization: null, totalBonus: 25 }] } as never;
    const { modifiers, result, setup } = await resolve(
      { skillId: 'influence', targets: [{ actorRound: target, character: sheet }] },
      { passive: { targetActorId: 'guard', roll: 90 } },
      70,
    );
    expect(modifiers.conflict).toBe(100 - 115);
    expect(setup.absolute).toHaveBeenCalledWith(expect.any(Number), 'influence', false);
    expect(result.maneuver!.modifiers).toMatchObject({ targetActorId: 'guard', passiveSkillId: 'social-awareness', passiveTotal: 115 });
  });

  it('a passive total sent wins over the target, and an NPC target needs its bonus', async () => {
    const npc = Object.assign(load(), { actorId: 'orc', actorName: 'Orc', actorType: 'npc' as const });
    const sent = await resolve(
      { skillId: 'influence', targets: [{ actorRound: npc }] },
      { passiveTotal: 120, passive: { targetActorId: 'orc', roll: 1, bonus: 5 } },
    );
    expect(sent.modifiers.conflict).toBe(-20);
    const withBonus = await resolve(
      { skillId: 'influence', targets: [{ actorRound: npc }] },
      { passive: { targetActorId: 'orc', roll: 50, bonus: 10 } },
    );
    expect(withBonus.modifiers.conflict).toBe(40);
    await expect(
      resolve({ skillId: 'influence', targets: [{ actorRound: npc }] }, { passive: { targetActorId: 'orc', roll: 50 } }),
    ).rejects.toThrow(expect.objectContaining({ code: 'err-maneuver-passive-bonus-required' }));
  });

  it('refuses a target without roll, unknown or the actor itself', async () => {
    await expect(resolve({ skillId: 'influence' }, { passive: { targetActorId: 'guard' } })).rejects.toThrow(
      expect.objectContaining({ code: 'err-maneuver-passive-roll-required' }),
    );
    await expect(resolve({ skillId: 'influence' }, { passive: { targetActorId: 'nobody', roll: 5 } })).rejects.toThrow(
      expect.objectContaining({ code: 'err-maneuver-target-not-found' }),
    );
    await expect(resolve({ skillId: 'influence' }, { passive: { targetActorId: 'actor-1', roll: 5 } })).rejects.toThrow(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it('reads the target fields of the request', () => {
    const dto = Object.assign(new ResolveManeuverDto(), {
      targetActorId: 'guard',
      passiveRoll: 40,
      passiveSkillId: 'perception',
      passiveBonus: 3,
      roll: { roll: 1 },
    });
    expect(ResolveManeuverDto.toCommand('a', dto, 'u', []).request.passive).toEqual({
      targetActorId: 'guard',
      roll: 40,
      skillId: 'perception',
      bonus: 3,
    });
    expect(
      ResolveManeuverDto.toCommand('a', Object.assign(new ResolveManeuverDto(), { roll: { roll: 1 } }), 'u', []).request.passive,
    ).toBeUndefined();
  });
});
