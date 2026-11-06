import { DISARMED } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { ActorRoundUsedBo } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-used-bo.vo.js';
import { attack, effect, load } from './actor-round-test.factory.js';

const twoWeapons = (parries: number[] = []) => load({ attacks: [attack('mainHand', 100), attack('offHand', 80)], parries });
const bos = (round: ReturnType<typeof load>) => round.attacks.map(each => each.currentBo);
const threeAttacks = () => {
  const unarmed = attack('unarmed-st-strikes', 40);
  unarmed.weaponCategory = 'unarmed';
  return load({ attacks: [attack('mainHand', 100), attack('offHand', 60), unarmed] });
};

describe('Shared OB margin (workspace spec 082, ADR 0012)', () => {
  describe('two weapons, +100 and +80', () => {
    it('keeps what both attacks leave to parry', () => {
      const round = twoWeapons();
      round.spendBo([
        { attackName: 'mainHand', bo: 70 },
        { attackName: 'offHand', bo: 50 },
      ]);
      expect(bos(round)).toEqual([30, 30]);
      expect(round.getAvailableParry()).toBe(30);
    });

    it('takes the least left: 100 and 50 leave nothing', () => {
      const round = twoWeapons();
      round.spendBo([
        { attackName: 'mainHand', bo: 100 },
        { attackName: 'offHand', bo: 50 },
      ]);
      expect(bos(round)).toEqual([0, 0]);
      expect(round.getAvailableParry()).toBe(0);
    });

    it('spends from the best OB with one attack of the main hand', () => {
      const round = twoWeapons();
      round.addUsedBo('mainHand', 60);
      expect(bos(round)).toEqual([40, 40]);
      expect(round.getAvailableParry()).toBe(40);
    });

    it('spends from the best OB with one attack of the off hand, which also loses its own', () => {
      const round = twoWeapons();
      round.addUsedBo('offHand', 60);
      expect(bos(round)).toEqual([40, 20]);
      expect(round.getAvailableParry()).toBe(40);
    });

    it('lets a parry made first lower every attack, and the attack spend the rest', () => {
      const round = twoWeapons([30]);
      expect(bos(round)).toEqual([70, 50]);
      round.spendBo([
        { attackName: 'mainHand', bo: 70 },
        { attackName: 'offHand', bo: 50 },
      ]);
      expect(bos(round)).toEqual([0, 0]);
    });

    it('lets a parry made after the attack take the margin', () => {
      const round = twoWeapons();
      round.spendBo([
        { attackName: 'mainHand', bo: 70 },
        { attackName: 'offHand', bo: 50 },
      ]);
      round.declareParry(30);
      expect(bos(round)).toEqual([0, 0]);
    });

    it('never goes negative: a parry of 90 leaves the off hand at 0', () => {
      const round = twoWeapons([90]);
      expect(bos(round)).toEqual([10, 0]);
      expect(round.getAvailableParry()).toBe(10);
    });
  });

  describe('several actions in the round', () => {
    it('carries the margin: 40 with the main hand leaves +60 for the off hand', () => {
      const round = twoWeapons();
      round.addUsedBo('mainHand', 40);
      expect(bos(round)).toEqual([60, 60]);
      round.addUsedBo('offHand', 60);
      expect(bos(round)).toEqual([0, 0]);
    });

    it('never adds up to more than the best OB', () => {
      const round = twoWeapons();
      round.addUsedBo('mainHand', 40);
      round.addUsedBo('offHand', 20);
      expect(bos(round)).toEqual([40, 40]);
    });
  });

  describe('attacks that are not weapons', () => {
    it('caps all of them with a weapon attack', () => {
      const round = threeAttacks();
      round.addUsedBo('mainHand', 70);
      expect(bos(round)).toEqual([30, 30, 30]);
    });

    it('does not leave the weapon at 0 after a punch with all its OB', () => {
      const round = threeAttacks();
      round.addUsedBo('unarmed-st-strikes', 40);
      expect(bos(round)).toEqual([60, 60, 0]);
      expect(round.getAvailableParry()).toBe(60);
    });

    it('does the same with a shield bash', () => {
      const round = threeAttacks();
      round.addUsedBo('offHand', 60);
      expect(bos(round)).toEqual([40, 0, 40]);
    });
  });

  it('takes the best OB from a ranged attack too, which cannot parry', () => {
    const round = load({ attacks: [attack('mainHand', 90, 90, 'ranged'), attack('offHand', 60)] });
    expect(round.getAvailableParry()).toBe(60);
    round.addUsedBo('mainHand', 30);
    expect(bos(round)).toEqual([60, 60]);
    expect(round.getAvailableParry()).toBe(60);
  });

  describe('attacks it cannot use', () => {
    it('does not parry with a broken weapon, nor count it as the best OB', () => {
      const broken = attack('mainHand', 100);
      broken.broken = true;
      const round = load({ attacks: [broken, attack('offHand', 80)] });
      expect(round.getAvailableParry()).toBe(80);
      expect(round.getParryBreakdown()?.attackName).toBe('offHand');
      round.addUsedBo('offHand', 30);
      expect(round.getCurrentBo('offHand')).toBe(50);
    });

    it('parries only with its body when disarmed', () => {
      const unarmed = attack('unarmed-st-strikes', 40);
      unarmed.weaponCategory = 'unarmed';
      const round = load({ attacks: [attack('mainHand', 100), unarmed], effects: [effect(DISARMED)] });
      expect(round.getAvailableParry()).toBe(40);
    });
  });

  it('lets a reaction ignore the parries but not the OB used', () => {
    const round = twoWeapons();
    round.addUsedBo('mainHand', 60);
    round.declareParry(40);
    expect(bos(round)).toEqual([0, 0]);
    expect(round.getBoIgnoringParries('mainHand')).toBe(40);
  });

  it('keeps the old sum in a round already started, without a ceiling', () => {
    const round = load({
      attacks: [attack('mainHand', 100), attack('offHand', 80)],
      usedBo: [new ActorRoundUsedBo('mainHand', 70), new ActorRoundUsedBo('offHand', 50)],
    });
    expect(bos(round)).toEqual([-20, -40]);
    round.addUsedBo('mainHand', 1);
    expect(round.boCeiling).toBeNull();
    expect(bos(round)).toEqual([-21, -41]);
  });

  it('loads the stored ceiling', () => {
    const round = load({
      attacks: [attack('mainHand', 100), attack('offHand', 80)],
      usedBo: [new ActorRoundUsedBo('mainHand', 60)],
      boCeiling: 40,
    });
    expect(bos(round)).toEqual([40, 40]);
  });
});
