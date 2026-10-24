import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round';
import { ActorRoundEffect } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo';
import { ActorRoundPhaseLog } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-phase-log.vo';
import { ApLedgerEntry } from '../../../src/modules/actor-rounds/domain/value-objects/ap-ledger-entry.vo';
import { ActorRoundDto } from '../../../src/modules/actor-rounds/interfaces/http/dto/actor-round.dto';
import { ValidationError } from '../../../src/modules/shared/domain/errors/errors';
import { effect, load } from './actor-round-test.factory';

const add = (round: ActorRound, effects: ActorRoundEffect[], phase = 0) =>
  round.applyAttackResults(0, effects, undefined, { phase, spentAp: round.getSpentAp(phase) });

describe('ActorRound AP capacity from effects (spec 011, §1)', () => {
  it('gives 1 AP per phase to an actor without effects', () => {
    const round = load({});

    expect(round.apCapacity).toEqual([1, 1, 1, 1]);
    expect(round.apModifiers).toEqual([]);
    expect(round.totalCapacity()).toBe(4);
  });

  it('adds the extra AP of haste from phase 4 backwards', () => {
    const round = load({});
    add(round, [effect('haste', 2, 3)]);

    expect(round.apCapacity).toEqual([1, 1, 2, 2]);
    expect(round.apModifiers).toEqual([expect.objectContaining({ source: 'haste', kind: 'bonus', value: 2 })]);
  });

  it('takes the AP of surprise and Hold Kind from phase 1', () => {
    const surprised = load({});
    const held = load({});
    const both = load({});
    add(surprised, [effect('surprised', 2)]);
    add(held, [effect('hold', undefined, 2)]);
    add(both, [effect('surprised', 2), effect('haste', 2, 1)]);

    expect(surprised.apCapacity).toEqual([0, 0, 1, 1]);
    expect(held.apCapacity).toEqual([0, 0, 0, 1]);
    expect(held.effects[0].value).toBe(3);
    expect(both.apCapacity).toEqual([0, 0, 2, 2]);
  });

  it('caps the AP with ap-cap and leaves a flatfooted actor without AP', () => {
    const capped = load({});
    const flatfooted = load({});
    add(capped, [effect('ap-cap', 2, 3)]);
    add(flatfooted, [effect('flatfooted')]);

    expect(capped.apCapacity).toEqual([0, 0, 1, 1]);
    expect(flatfooted.apCapacity).toEqual([0, 0, 0, 0]);
  });

  it('adds or takes the AP of a manual effect', () => {
    const plus = load({});
    const minus = load({});
    add(plus, [effect('manual', 1)]);
    add(minus, [effect('manual', -1)]);

    expect(plus.apCapacity).toEqual([1, 1, 1, 2]);
    expect(minus.apCapacity).toEqual([0, 1, 1, 1]);
  });

  it('gives the adrenal speed bonus only in the round it is applied in', () => {
    const round = load({ round: 2, effects: [new ActorRoundEffect('a', 'adrenal-speed', 2, 2, 1, 1, 0)] });
    const now = load({ round: 2, effects: [new ActorRoundEffect('a', 'adrenal-speed', 2, 2, 2, 1, 0)] });

    expect(round.apCapacity).toEqual([1, 1, 1, 1]);
    expect(now.apCapacity).toEqual([1, 1, 2, 2]);
  });

  it('recomputes the capacity when an effect is removed', () => {
    const round = load({});
    add(round, [effect('haste', 2, 3)]);

    round.deleteEffect(round.effects[0].id);

    expect(round.apCapacity).toEqual([1, 1, 1, 1]);
  });

  it('rejects AP effects without a valid value', () => {
    expect(() => add(load({}), [effect('haste')])).toThrow(ValidationError);
    expect(() => add(load({}), [effect('haste', 5)])).toThrow(ValidationError);
    expect(() => add(load({}), [effect('manual', 0)])).toThrow(ValidationError);
    expect(() => add(load({}), [effect('reflexes', 4)])).toThrow(ValidationError);
  });
});

describe('ActorRound staggered (spec 011, §1; §8.3, §9.8)', () => {
  it('loses the AP of the phase it is applied in, or of the next one when the actor already spent it', () => {
    const before = load({});
    const after = load({});
    after.spend(1, 'action-1', 1);
    after.spend(2, 'action-1', 1);
    add(before, [effect('staggered')], 2);
    add(after, [effect('staggered')], 2);

    expect(before.apCapacity).toEqual([1, 0, 1, 1]);
    expect(after.apCapacity).toEqual([1, 1, 0, 1]);
    expect(after.apModifiers).toEqual([expect.objectContaining({ source: 'staggered', kind: 'loss', value: 1, phase: 2 })]);
  });

  it('is removed in the upkeep once applied', () => {
    const round = load({});
    add(round, [effect('staggered')], 2);

    round.applyUpkeep();

    expect(round.effects).toEqual([]);
    expect(ActorRound.createFromPrevious(round).apCapacity).toEqual([1, 1, 1, 1]);
  });

  it('carries the AP it could not take to phase 1 of the next round', () => {
    const round = load({});
    [1, 2, 3, 4].forEach(phase => round.spend(phase, 'action-1', 1));
    add(round, [effect('staggered', 2)], 4);
    expect(round.apPendingLoss).toBe(2);

    round.applyUpkeep();
    const next = ActorRound.createFromPrevious(round);

    expect(next.apCapacity).toEqual([0, 0, 1, 1]);
    next.applyUpkeep();
    expect(next.effects).toEqual([]);
  });
});

describe('ActorRound reflexes initiative (spec 011, §1)', () => {
  it('adds +10, +15 or +20 to the initiative by the value of the effect, as Strike Reflex does', () => {
    const [one, two, three] = [1, 2, 3].map(value => {
      const round = load({});
      add(round, [effect('reflexes', value, 1)]);
      round.declareInitiative(10);
      return round;
    });

    expect(one.initiative).toMatchObject({ reflexes: 10, total: 20 });
    expect(two.initiative).toMatchObject({ reflexes: 15, total: 25 });
    expect(three.initiative).toMatchObject({ reflexes: 20, total: 30 });
    expect(three.apCapacity).toEqual([1, 2, 2, 2]);
  });
});

describe('ActorRound AP ledger (spec 011, §2)', () => {
  it('records the AP spent by phase and action, and gives the free capacity', () => {
    const round = load({});
    add(round, [effect('haste', 2, 3)]);

    round.spend(3, 'action-1', 1);
    round.spend(3, 'action-2', 1);
    round.spend(4, 'action-2', 1);
    round.spend(4, 'action-3', 0, 'instant');

    expect(round.freeCapacity(3)).toBe(0);
    expect(round.freeCapacity(4)).toBe(1);
    expect(round.spentByAction('action-2')).toBe(2);
    expect(round.totalSpent()).toBe(3);
    expect(round.remainingCapacity(3)).toBe(1);
    expect(round.ledgerOf('action-2').map(entry => entry.phase)).toEqual([3, 4]);
  });

  it('rejects spending AP a phase does not have, and records lost AP without using capacity', () => {
    const round = load({});
    add(round, [effect('surprised', 2)]);

    expect(() => round.spend(1, 'action-1', 1)).toThrow('no action points left in phase 1');
    round.spend(1, 'action-1', 1, 'lost');

    expect(round.spentByAction('action-1')).toBe(0);
    expect(round.apLedger).toEqual([new ApLedgerEntry(1, 'action-1', 1, 'lost')]);
  });

  it('starts empty every round', () => {
    const round = load({});
    round.spend(1, 'action-1', 1);

    expect(ActorRound.createFromPrevious(round).apLedger).toEqual([]);
  });
});

describe('ActorRound AP ledger of older actor rounds (spec 011, Riesgos)', () => {
  const action = (id: string, phaseStart: number, phaseEnd: number | null, freeAction = false) => ({
    id,
    phaseStart,
    phaseEnd,
    freeAction,
  });

  it('rebuilds the ledger from the phase log', () => {
    const round = ActorRound.fromProps({
      ...load({}).getProps(),
      apLedger: undefined,
      phaseLog: [new ActorRoundPhaseLog(1, 1, 1), new ActorRoundPhaseLog(2, 0, 1), new ActorRoundPhaseLog(3, 1, 2)],
    });

    expect(round.apLedger).toEqual([new ApLedgerEntry(1, undefined, 1, 'spent'), new ApLedgerEntry(3, undefined, 1, 'spent')]);
    expect(round.getSpentAp(4)).toBe(2);
  });

  it('fills the ledger from the actions, 1 AP per phase an action spans', () => {
    const round = load({});

    round.fillLedgerFromActions([action('a', 1, 2), action('b', 3, null), action('free', 2, 2, true)], 3);

    expect(round.apLedger).toEqual([
      new ApLedgerEntry(2, 'free', 0, 'instant'),
      new ApLedgerEntry(1, 'a', 1, 'spent'),
      new ApLedgerEntry(2, 'a', 1, 'spent'),
      new ApLedgerEntry(3, 'b', 1, 'spent'),
    ]);
    expect(round.spentByAction('a')).toBe(2);
  });

  it('leaves the phases already recorded when it runs again', () => {
    const round = load({});
    round.fillLedgerFromActions([action('a', 1, null)], 1);
    round.fillLedgerFromActions([action('a', 1, null)], 2);

    expect(round.apLedger).toEqual([new ApLedgerEntry(1, 'a', 1, 'spent'), new ApLedgerEntry(2, 'a', 1, 'spent')]);
  });

  it('derives the phase log of the DTO from the ledger', () => {
    const round = load({});
    round.spend(1, 'a', 1);
    round.spend(3, 'b', 1);

    expect(ActorRoundDto.fromEntity(round).phaseLog.map(entry => ({ ...entry }))).toEqual([
      { phase: 1, spentAp: 1, totalSpentAp: 1 },
      { phase: 2, spentAp: 0, totalSpentAp: 1 },
      { phase: 3, spentAp: 1, totalSpentAp: 2 },
    ]);
    expect(ActorRoundDto.fromEntity(round).apCapacity).toEqual([1, 1, 1, 1]);
  });
});

describe('ActorRound losses applied in the middle of the round (spec 011, §1)', () => {
  it('takes a Hold Kind applied in phase 3 from that phase on, leaving the phases before it', () => {
    const round = load({});
    [1, 2].forEach(phase => round.spend(phase, 'action-1', 1));
    add(round, [effect('hold', 3, 2)], 3);

    expect(round.apCapacity).toEqual([1, 1, 0, 0]);
    expect(round.apPendingLoss).toBe(1);
    expect(round.apModifiers).toEqual([expect.objectContaining({ source: 'hold', kind: 'loss', value: 3, phase: 3 })]);
  });

  it('skips the phases already spent', () => {
    const round = load({});
    [1, 2, 3].forEach(phase => round.spend(phase, 'action-1', 1));
    add(round, [effect('distraction', 1, 1)], 2);

    expect(round.apCapacity).toEqual([1, 1, 1, 0]);
  });

  it('keeps taking from phase 1 the losses the round starts with', () => {
    expect(load({ effects: [effect('hold', 3, 2)] }).apCapacity).toEqual([0, 0, 0, 1]);
  });

  it('does not carry to the next round the AP of a loss that goes on in it', () => {
    const round = load({});
    [1, 2, 3, 4].forEach(phase => round.spend(phase, 'action-1', 1));
    add(round, [effect('hold', 3, 2)], 4);
    expect(round.apPendingLoss).toBe(3);

    round.applyUpkeep();
    const next = ActorRound.createFromPrevious(round);

    expect(next.effects.map(e => e.status)).toEqual(['hold']);
    expect(next.apCapacity).toEqual([0, 0, 0, 1]);
  });
});
