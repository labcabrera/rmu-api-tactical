import { describe, expect, it } from 'vitest';
import {
  ManeuverRoll,
  ResolveManeuverCommand,
  ResolveManeuverRequest,
} from '../../../../src/modules/actions/application/cqrs/commands/resolve-maneuver.command.js';
import { ResolveManeuverHandler } from '../../../../src/modules/actions/application/cqrs/handlers/resolve-maneuver.handler.js';
import { ResolveManeuverDto } from '../../../../src/modules/actions/interfaces/http/dto/resolve-maneuver.dto.js';
import { breakdown, type ManeuverSetup, setupManeuver } from './maneuver-test.factory.js';

const handlerFor = (setup: ReturnType<typeof setupManeuver>) =>
  new ResolveManeuverHandler(
    setup.gameRepository,
    setup.actorRoundRepository,
    setup.actionRepository,
    setup.eventBus,
    setup.maneuverPort,
    setup.contextService,
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
