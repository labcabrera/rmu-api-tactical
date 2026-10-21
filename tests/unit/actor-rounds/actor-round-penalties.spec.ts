import { attack, effect, load } from './actor-round-test.factory';

describe('ActorRound penalties', () => {
  it('keeps the penalties out of the OB left, recomputing what was stored with them folded in', () => {
    const round = load({ attacks: [attack('mainHand', 80, 5)], penalties: [['hp', -75]] });

    expect(round.getCurrentBo('mainHand')).toBe(80);
  });

  it('subtracts the OB used and the parries from the OB left', () => {
    const round = load({ attacks: [attack('mainHand', 80)], parries: [10] });

    round.addUsedBo('mainHand', 30);

    expect(round.getCurrentBo('mainHand')).toBe(40);
  });

  it('groups the penalties by source and leaves out the zero ones', () => {
    const round = load({
      attacks: [],
      hp: [50, 20],
      penalties: [
        ['critical', -10],
        ['critical', -5],
        ['stunned', 0],
      ],
    });

    expect(round.getPenaltiesBySource()).toEqual([
      { source: 'injury', value: -15 },
      { source: 'hp', value: -20 },
    ]);
    expect(round.getPenaltySum()).toBe(-35);
  });

  it('recomputes the hit point penalties stored with the older values (-25/-50/-75)', () => {
    const round = load({ hp: [50, 20], penalties: [['hp', -50]] });

    expect(round.getPenaltiesBySource()).toEqual([{ source: 'hp', value: -20 }]);
  });

  it.each([
    [50, 0],
    [38, 0],
    [37, -10],
    [25, -10],
    [24, -20],
    [13, -20],
    [12, -30],
    [-5, -30],
  ])('applies the Table 9-8b penalty at %i of 50 hits: %i', (current, expected) => {
    const round = load({ hp: [50, 50] });

    round.applyAttackResults(50 - current, [], undefined);

    expect(round.getPenaltiesBySource().find(p => p.source === 'hp')?.value ?? 0).toBe(expected);
  });

  it('caps the parry with the penalties, never below zero', () => {
    const wounded = load({
      attacks: [attack('mainHand', 80), attack('offHand', 40), attack('bow', 90, 90, 'ranged')],
      hp: [50, 20],
    });
    const dying = load({ attacks: [attack('mainHand', 20)], hp: [50, 5] });

    expect(wounded.getAvailableParry()).toBe(60);
    expect(dying.getAvailableParry()).toBe(0);
  });

  it('sets the hit point penalty from the damage and drops the zero stun entries of older rounds', () => {
    const round = load({ attacks: [attack('mainHand', 80)], hp: [40, 40], penalties: [['stunned', 0]] });

    round.applyAttackResults(31, [], undefined);

    expect(round.getPenaltiesBySource()).toEqual([{ source: 'hp', value: -30 }]);
    expect(round.penalty.modifiers.some(modifier => modifier.source === 'stunned')).toBe(false);
    expect(round.getCurrentBo('mainHand')).toBe(80);
  });

  it('adds the worst active stun to the penalties, so that it reaches the parry', () => {
    const round = load({ attacks: [attack('mainHand', 80)] });

    round.applyAttackResults(0, [effect('stunned', -25, 2), effect('stunned', -50, 1)], undefined);

    expect(round.getPenaltiesBySource()).toEqual([{ source: 'stunned', value: -50 }]);
    expect(round.getAvailableParry()).toBe(30);
  });

  it('removes the stun penalty with the stun effect', () => {
    const round = load({});
    round.applyAttackResults(0, [effect('stunned', -25, 2)], undefined);

    round.deleteEffect(round.effects[0].id);

    expect(round.getPenaltiesBySource()).toEqual([]);
  });
});
