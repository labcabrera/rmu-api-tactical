import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.aggregate';
import { ActorRoundAttack } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-attack.vo';
import { ActorRoundHP } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-hp.vo';
import { ActorRoundPenalty } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-penalty.vo';
import { ActorRoundPenaltyModifier } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-penalty-modifier.vo';

const attack = (attackName: string, baseBo: number, currentBo = baseBo, type: 'melee' | 'ranged' = 'melee') =>
  new ActorRoundAttack(attackName, [], baseBo, currentBo, type, 'arming-sword', 'melee-one-hand', 0, 3, false, null, null);

/** An actor round as the repository loads it, with a stored `currentBo` that may hold the penalties. */
const load = (options: { attacks: ActorRoundAttack[]; penalties?: Array<[string, number]>; hp?: [number, number]; parries?: number[] }) => {
  const empty = ActorRound.empty();
  return ActorRound.fromProps({
    ...empty,
    hp: new ActorRoundHP(...(options.hp ?? [50, 50])),
    penalty: new ActorRoundPenalty(
      (options.penalties ?? []).map(([source, value], i) => new ActorRoundPenaltyModifier(`p${i}`, source as never, value)),
    ),
    attacks: options.attacks,
    usedBo: [],
    parries: options.parries ?? [],
  });
};

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
      penalties: [
        ['critical', -10],
        ['hp', -50],
        ['critical', -5],
        ['stunned', 0],
      ],
    });

    expect(round.getPenaltiesBySource()).toEqual([
      { source: 'critical', value: -15 },
      { source: 'hp', value: -50 },
    ]);
    expect(round.getPenaltySum()).toBe(-65);
  });

  it('caps the parry with the penalties, never below zero', () => {
    const wounded = load({
      attacks: [attack('mainHand', 80), attack('offHand', 40), attack('bow', 90, 90, 'ranged')],
      penalties: [['hp', -50]],
    });
    const dying = load({ attacks: [attack('mainHand', 60)], penalties: [['hp', -75]] });

    expect(wounded.getAvailableParry()).toBe(30);
    expect(dying.getAvailableParry()).toBe(0);
  });

  it('sets the hit point penalty from the damage, with no penalty for being stunned', () => {
    const round = load({ attacks: [attack('mainHand', 80)], hp: [40, 40], penalties: [['stunned', 0]] });

    round.applyAttackResults(31, [], undefined);

    expect(round.getPenaltiesBySource()).toEqual([{ source: 'hp', value: -75 }]);
    expect(round.penalty.modifiers.some(modifier => modifier.source === 'stunned')).toBe(false);
    expect(round.getCurrentBo('mainHand')).toBe(80);
  });
});
