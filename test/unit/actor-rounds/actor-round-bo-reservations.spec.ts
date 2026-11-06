import { describe, expect, it } from 'vitest';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundAttack } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-attack.vo.js';
import { ActorRoundUsedBo } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-used-bo.vo.js';
import { ActorRoundPenalty } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-penalty.vo.js';

const attack = (name: string, bo: number) =>
  new ActorRoundAttack(name, [], bo, bo, 'melee', 'arming-sword', 'melee-one-hand', 0, 3, false, null, null);

/** Workspace spec 083, ADR 0013: an actor with +100 and +80 unless it says otherwise. */
const actor = (attacks = [attack('main', 100), attack('off', 80)]) =>
  Object.assign(Object.create(ActorRound.prototype) as ActorRound, {
    attacks,
    usedBo: [] as ActorRoundUsedBo[],
    parries: [],
    boCeiling: null,
    boReservations: [],
    effects: [],
    traits: [],
    penalty: new ActorRoundPenalty([]),
  });

const obs = (round: ActorRound) => round.attacks.map(each => each.currentBo);

describe('OB reservations of an actor round', () => {
  it('counts a parry reserved in the OB of every attack and in the parry available', () => {
    const round = actor();
    round.reserveParryBo('a', 20);
    expect(obs(round)).toEqual([80, 60]);
    expect(round.getAvailableParry()).toBe(80);
    expect(round.parries).toEqual([]);
    expect(round.committedParries()).toEqual([20]);
  });

  it('counts an attack reserved like the margin of ADR 0012', () => {
    const round = actor();
    round.reserveAttackBo('a', [{ attackName: 'main', bo: 60 }]);
    expect(obs(round)).toEqual([40, 40]);
    expect(round.boCeiling).toBeNull();
    expect(round.usedBo).toEqual([]);
  });

  it('gives back exactly what it took, in any order', () => {
    const round = actor();
    round.reserveParryBo('a', 20);
    round.reserveAttackBo('b', [
      { attackName: 'main', bo: 30 },
      { attackName: 'off', bo: 30 },
    ]);
    expect(obs(round)).toEqual([30, 30]);
    round.releaseBoReservations('a');
    expect(obs(round)).toEqual([50, 50]);
    round.releaseBoReservations('b');
    expect(obs(round)).toEqual([100, 80]);
    expect(round.releaseBoReservations('b')).toBe(false);
  });

  it('gives the same result when the action is applied as while it was reserved', () => {
    const reserved = actor();
    reserved.reserveParryBo('p', 20);
    reserved.reserveAttackBo('a', [{ attackName: 'off', bo: 50 }]);
    const left = obs(reserved);
    reserved.spendBo([{ attackName: 'off', bo: 50 }], 'a');
    expect(obs(reserved)).toEqual(left);
    reserved.declareParry(20, 'p');
    expect(obs(reserved)).toEqual(left);
    expect(reserved.boReservations).toEqual([]);
  });

  it('replaces a reservation of the same action, and drops it at 0', () => {
    const round = actor();
    expect(round.reserveParryBo('a', 20)).toBe(true);
    expect(round.reserveParryBo('a', 20)).toBe(false);
    expect(round.reserveParryBo('a', 30)).toBe(true);
    expect(round.boReservations).toHaveLength(1);
    expect(obs(round)).toEqual([70, 50]);
    expect(round.reserveParryBo('a', 0)).toBe(true);
    expect(round.boReservations).toEqual([]);
    expect(round.reserveParryBo('b', 0)).toBe(false);
  });

  it('leaves the OB of a reaction out of the parries, not out of the attacks', () => {
    const round = actor();
    round.reserveParryBo('a', 100);
    expect(obs(round)).toEqual([0, 0]);
    expect(round.getBoIgnoringParries('main')).toBe(100);
    round.reserveAttackBo('b', [{ attackName: 'main', bo: 0 }]);
    round.releaseBoReservations('a');
    round.reserveAttackBo('b', [{ attackName: 'main', bo: 60 }]);
    expect(round.getBoIgnoringParries('main')).toBe(40);
  });

  it('keeps taking all the OB used from every attack in a round started before spec 082', () => {
    const round = actor();
    round.usedBo.push(new ActorRoundUsedBo('main', 30));
    round.reserveParryBo('a', 10);
    expect(obs(round)).toEqual([60, 40]);
  });
});
