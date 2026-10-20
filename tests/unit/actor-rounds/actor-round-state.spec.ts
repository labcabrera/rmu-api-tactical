import { ValidationError, UnprocessableEntityError } from '../../../src/modules/shared/domain/errors';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.aggregate';
import { ActorRoundShield } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-shield.vo';
import { effect, load } from './actor-round-test.factory';

describe('ActorRound initiative (§8.3 Initiative Phase)', () => {
  it('follows the example of Moriah: -75 to all actions gives -7', () => {
    // Sprained ankle -25, half hits lost -20, fatigued -25, encumbered -5.
    const round = load({
      hp: [50, 24],
      penalties: [
        ['critical', -25],
        ['endurance', -25],
        ['critical', -5],
      ],
    });
    expect(round.getPenaltySum()).toBe(-75);

    round.declareInitiative(15);

    expect(round.initiative).toMatchObject({ penalty: -7, roll: 15, total: 8 });
  });

  it('adds the base and rounds the penalty toward zero', () => {
    const light = load({ initiativeBase: 3, penalties: [['critical', -9]] });
    const none = load({ initiativeBase: 3 });

    light.declareInitiative(10);
    none.declareInitiative(10);

    expect(light.initiative).toMatchObject({ penalty: 0, total: 13 });
    expect(none.initiative).toMatchObject({ penalty: 0, total: 13 });
  });

  it('rejects the initiative of a flatfooted actor', () => {
    const round = load({});
    round.applyAttackResults(0, [effect('flatfooted')], undefined);

    expect(() => round.declareInitiative(10)).toThrow(ValidationError);
  });
});

describe('ActorRound surprise (§8.3 Surprise)', () => {
  it('loses 2 AP when surprised, or the value of the effect', () => {
    const surprised = load({});
    const perceptive = load({});
    surprised.applyAttackResults(0, [effect('surprised')], undefined, { phase: 0, spentAp: 0 });
    perceptive.applyAttackResults(0, [effect('surprised', 1)], undefined, { phase: 0, spentAp: 0 });

    expect(surprised.getLostActionPoints()).toBe(2);
    expect(surprised.effects[0]).toMatchObject({ value: 2, rounds: 1 });
    expect(perceptive.getLostActionPoints()).toBe(1);
    expect(load({}).getLostActionPoints()).toBe(0);
  });

  it('loses every AP when flatfooted', () => {
    const round = load({});
    round.applyAttackResults(0, [effect('flatfooted')], undefined, { phase: 0, spentAp: 0 });

    expect(round.getLostActionPoints()).toBe(4);
  });

  it('rejects a surprise that loses other than 1 or 2 AP', () => {
    expect(() => load({}).applyAttackResults(0, [effect('surprised', 3)], undefined)).toThrow(ValidationError);
  });

  it('ends the surprise states with the round they are set in', () => {
    const round = load({});
    round.applyAttackResults(0, [effect('surprised'), effect('flatfooted')], undefined, { phase: 0, spentAp: 0 });

    round.applyUpkeep();

    expect(round.effects).toEqual([]);
  });
});

describe('ActorRound shield and defense mode (§9.6)', () => {
  it('counts the blocks of the round and resets them in the next one', () => {
    const round = load({ shield: new ActorRoundShield(25, 2, 0) });

    round.useShieldBlock();
    round.useShieldBlock();

    expect(round.defense.shield!.currentBlocks).toBe(2);
    expect(round.hasShieldBlocksLeft()).toBe(false);
    expect(() => round.useShieldBlock()).toThrow(UnprocessableEntityError);
    const next = ActorRound.createFromPrevious(round);
    expect(next.defense.shield!.currentBlocks).toBe(0);
    expect(round.defense.shield!.currentBlocks).toBe(2);
  });

  it('rejects a block without a shield', () => {
    const round = load({});

    expect(() => round.useShieldBlock()).toThrow(UnprocessableEntityError);
    expect(() => round.setDefenseMode('none', 'passive')).toThrow(ValidationError);
  });

  it('declares passive and partial defenses, keeping the one not given, and resets them every round', () => {
    const round = load({ shield: new ActorRoundShield(25, 2, 0) });

    round.setDefenseMode('partial', undefined);
    round.setDefenseMode(undefined, 'passive');

    expect(round.defenseMode).toEqual({ dodge: 'partial', block: 'passive' });
    expect(ActorRound.createFromPrevious(round).defenseMode).toEqual({ dodge: 'none', block: 'none' });
  });

  it('rejects a full defense out of a dodge action and two defenses of the same kind', () => {
    const round = load({ shield: new ActorRoundShield(25, 2, 0) });

    expect(() => round.setDefenseMode('full', 'none')).toThrow(ValidationError);
    expect(() => round.setDefenseMode('passive', 'passive')).toThrow(ValidationError);
  });

  it('sets a full dodge or block from a dodge action', () => {
    const round = load({ shield: new ActorRoundShield(25, 2, 0) });
    round.setDefenseMode('partial', 'passive');

    round.setFullDefense('dodge');
    expect(round.defenseMode).toEqual({ dodge: 'full', block: 'passive' });
    round.setDefenseMode(undefined, 'partial');
    expect(round.defenseMode).toEqual({ dodge: 'full', block: 'partial' });
    round.setFullDefense('block');
    expect(round.defenseMode).toEqual({ dodge: 'none', block: 'full' });
  });
});
