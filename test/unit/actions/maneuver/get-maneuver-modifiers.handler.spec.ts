import { describe, expect, it } from 'vitest';
import { GetManeuverModifiersHandler } from '../../../../src/modules/actions/application/cqrs/handlers/get-maneuver-modifiers.handler';
import { GetManeuverModifiersQuery } from '../../../../src/modules/actions/application/cqrs/queries/get-maneuver-modifiers.query';
import { ManeuverModifiersDto } from '../../../../src/modules/actions/interfaces/http/dto/maneuver-modifiers.dto';
import { CATALOG, ManeuverSetup, setupManeuver } from './maneuver-test.factory';

const list = async (options: ManeuverSetup = {}, skillId?: string, specialization?: string) => {
  const setup = setupManeuver(options);
  const handler = new GetManeuverModifiersHandler(setup.actionRepository, setup.gameRepository, setup.contextService);
  const listing = await handler.execute(new GetManeuverModifiersQuery('action-1', skillId, specialization, 'user-1', []));
  return { setup, listing };
};

describe('GetManeuverModifiersHandler', () => {
  it('lists skill, type, table, base modifiers, difficulties and the conflict option', async () => {
    const { listing } = await list({
      skillId: 'wall-scaling',
      maneuverPenalty: -30,
      encumbrancePenalty: -10,
      pace: 'walk',
      penalties: [['critical', -20]],
    });
    expect(listing.skill).toEqual({ skillId: 'wall-scaling', specialization: null, bonus: 40, ranks: 5, unskilled: false });
    expect(listing.maneuverType).toBe('absolute');
    expect(listing.resultTable).toBe('gymnastic');
    expect(listing.base).toEqual([
      { key: 'penalty-injury', value: -20, source: 'actor-round' },
      { key: 'armor-maneuver', value: -30, source: 'equipment' },
      { key: 'encumbrance', value: -10, source: 'equipment' },
      { key: 'pace', value: -25, source: 'movement' },
    ]);
    expect(listing.difficulty.default).toBe('m');
    expect(listing.difficulty.options).toEqual(
      expect.arrayContaining([
        { key: 'c', value: 70 },
        { key: 'ni', value: -100 },
      ]),
    );
    expect(listing.conflicting).toBe(true);
    expect(listing.light).toBeUndefined();
    expect(listing.skillModifiers).toEqual([]);
  });

  it('criterion 5: offers light only when the skill uses it, with the required values doubled', async () => {
    const { listing } = await list({ skillId: 'keen-eye' });
    expect(listing.light!.usage).toBe('required');
    expect(listing.light!.options).toEqual(
      expect.arrayContaining([
        { key: 'dark', value: -50 },
        { key: 'pitch_black', value: -100 },
      ]),
    );
    expect((await list({ skillId: 'old-lore' })).listing.light).toBeUndefined();
  });

  it('criterion 6: lists the catalog modifiers of the skill', async () => {
    const { listing } = await list({ skillId: 'creature-taming' });
    expect(listing.skillModifiers.map(m => m.key)).toEqual([
      'creature-temper',
      'creature-wits',
      'creature-herd',
      'creature-kin',
      'creature-habitat',
    ]);
    expect(ManeuverModifiersDto.fromListing(listing).skillModifiers[0]).toEqual(
      expect.objectContaining({ ...CATALOG['creature-taming'][0] }),
    );
  });

  it('counts the AP the action would take if it ended in the current phase', async () => {
    const { listing } = await list({ skillId: 'quick-fix', phaseStart: 2, phase: 'phase_3' });
    expect(listing.base).toEqual([{ key: 'action-points', value: -50, source: 'action' }]);
  });

  it('switches to another skill and specialization, and marks an unskilled actor', async () => {
    const { listing, setup } = await list({}, 'wall-scaling', 'trees');
    expect(setup.findSkill).toHaveBeenCalledWith('wall-scaling');
    expect(listing.skill).toEqual({ skillId: 'wall-scaling', specialization: 'trees', bonus: -25, ranks: 0, unskilled: true });
  });

  it('a percent maneuver shows its progress and no conflict', async () => {
    const { listing } = await list({ skillId: 'desk-work', maneuver: { progress: 30 } });
    expect(listing.maneuverType).toBe('percent');
    expect(listing.conflicting).toBe(false);
    expect(listing.progress).toBe(30);
  });

  it('fails for a skill core does not know and for an action that is not a maneuver', async () => {
    await expect(list({ skillId: 'missing' })).rejects.toThrow('Skill');
    const setup = setupManeuver();
    setup.action.maneuver = null;
    const handler = new GetManeuverModifiersHandler(setup.actionRepository, setup.gameRepository, setup.contextService);
    await expect(handler.execute(new GetManeuverModifiersQuery('action-1', undefined, undefined, 'u', []))).rejects.toThrow(
      'not a maneuver',
    );
  });
});
