import { ActionApProfile } from '../../../src/modules/actions/domain/value-objects/action-ap-profile.vo.js';

describe('ActionApProfile (spec 011, §3)', () => {
  it('gives the AP range of each action type', () => {
    const range = (profile: ActionApProfile) => [profile.min, profile.max, profile.penaltyPerMissing];

    expect(range(ActionApProfile.forAction('melee_attack'))).toEqual([2, 4, -25]);
    expect(range(ActionApProfile.forAction('ranged_attack'))).toEqual([1, 3, -25]);
    expect(range(ActionApProfile.forAction('movement'))).toEqual([1, 1, 0]);
    expect(range(ActionApProfile.forAction('stand_up'))).toEqual([2, 2, 0]);
    expect(range(ActionApProfile.forAction('stand_up', { acrobatics: true }))).toEqual([1, 1, 0]);
    expect(range(ActionApProfile.forAction('dodge'))).toEqual([4, 4, 0]);
    expect(range(ActionApProfile.forAction('draw_and_load'))).toEqual([1, 1, 0]);
    expect(range(ActionApProfile.forAction('other'))).toEqual([1, 1, 0]);
  });

  it('takes the maneuver range from the skill profile, 1-1 without one', () => {
    expect(ActionApProfile.forAction('maneuver', { maneuver: { min: 1, max: 3 } })).toMatchObject({ min: 1, max: 3 });
    expect(ActionApProfile.forAction('maneuver')).toMatchObject({ min: 1, max: 1 });
  });

  it('gives -25 per AP below the maximum, and nothing over it', () => {
    const melee = ActionApProfile.forAction('melee_attack');

    expect(melee.penaltyFor(2)).toBe(-50);
    expect(melee.penaltyFor(4)).toBe(0);
    expect(melee.penaltyFor(5)).toBe(0);
    expect(melee.reachesMin(1)).toBe(false);
    expect(melee.reachesMin(2)).toBe(true);
  });
});
