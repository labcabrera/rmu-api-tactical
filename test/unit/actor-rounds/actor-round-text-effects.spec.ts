import { randomUUID } from 'crypto';
import { describe, expect, it } from 'vitest';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundAlert } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-alert.vo.js';
import { ActorRoundEffect } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { NotFoundError } from '../../../src/modules/shared/domain/errors/errors.js';
import { attack, effect, load } from './actor-round-test.factory.js';

/** Closes the round and opens the next one, as StartRoundHandler does. */
const nextRound = (round: ActorRound) => {
  round.applyUpkeep();
  return ActorRound.createFromPrevious(round);
};

/** An effect that starts in `fromRound`. */
const delayed = (status: string, value: number | undefined, rounds: number, fromRound: number) =>
  new ActorRoundEffect(randomUUID(), status, value, rounds, undefined, undefined, undefined, undefined, undefined, fromRound);

describe('ActorRound effects of the critical and fumble texts (workspace spec 034)', () => {
  it('caps the action points at 2 with half activity', () => {
    const round = load({});
    round.applyAttackResults(0, [effect('half_activity', undefined, 6)], undefined);

    expect(round.totalCapacity()).toBe(2);
    expect(round.apModifiers).toEqual([expect.objectContaining({ source: 'half-activity', kind: 'cap', value: 2 })]);
  });

  it('applies a delayed effect from its round, without losing rounds before it', () => {
    let round = load({ round: 1 });
    round.applyAttackResults(0, [delayed('half_activity', undefined, 1, 2)], undefined, { phase: 1, spentAp: 0 });

    expect(round.hasEffect('half_activity')).toBe(false);
    expect(round.totalCapacity()).toBe(4);

    round = nextRound(round);
    expect(round.hasEffect('half_activity')).toBe(true);
    expect(round.totalCapacity()).toBe(2);

    round = nextRound(round);
    expect(round.effects.map(e => e.status)).toEqual([]);
  });

  it('knocks out a held actor only when its delay is over', () => {
    let round = load({ round: 1 });
    round.applyAttackResults(0, [delayed('unconscious', undefined, undefined as never, 3)], undefined, { phase: 1, spentAp: 0 });

    expect(round.isIncapacitated()).toBe(false);
    round = nextRound(round);
    expect(round.isIncapacitated()).toBe(false);
    round = nextRound(round);
    expect(round.isIncapacitated()).toBe(true);
  });

  it('knocks out at once an actor brought to 0 hits while a delayed unconsciousness waits', () => {
    const round = load({ round: 1, hp: [20, 20] });
    round.applyAttackResults(0, [delayed('unconscious', undefined, undefined as never, 4)], undefined, { phase: 1, spentAp: 0 });

    round.applyAttackResults(25, [], undefined, { phase: 2, spentAp: 1 });

    expect(round.isIncapacitated()).toBe(true);
    expect(round.effects.filter(e => e.status === 'unconscious')).toEqual([expect.objectContaining({ fromRound: undefined })]);
  });

  it('takes the initiative penalty of the round it falls in', () => {
    let round = load({ round: 1, initiativeBase: 5 });
    round.applyAttackResults(0, [delayed('initiative_penalty', -5, 1, 2)], undefined, { phase: 1, spentAp: 0 });

    round.declareInitiative(10);
    expect(round.initiative.total).toBe(15);

    round = nextRound(round);
    round.declareInitiative(10);
    expect(round.initiative.penalty).toBe(-5);
    expect(round.initiative.total).toBe(10);
  });

  it('leaves no parry to an actor that cannot parry or has a useless arm', () => {
    const attacks = [attack('mainHand', 60)];
    expect(load({ attacks }).getAvailableParry()).toBe(60);
    expect(load({ attacks, effects: [effect('cannot_parry', undefined, 1)] }).getAvailableParry()).toBe(0);
    expect(load({ attacks, effects: [effect('arm_useless')] }).getAvailableParry()).toBe(0);
  });

  it('tells the attacks the actor cannot make', () => {
    expect(load({ effects: [effect('cannot_attack', undefined, 2)] }).isAttackForbidden()).toBe(true);
    expect(load({ effects: [effect('disarmed')] }).isDisarmed()).toBe(true);
    expect(load({ effects: [effect('arm_useless')] }).isDisarmed()).toBe(true);
    expect(load({}).isDisarmed()).toBe(false);
  });

  it('adds up the attack penalties and keeps a single disarmed effect', () => {
    const round = load({ effects: [effect('attack_penalty', -25, 2), effect('attack_penalty', -10, 1)] });
    round.applyAttackResults(0, [effect('disarmed'), effect('disarmed')], undefined);

    expect(round.getAttackPenalty()).toBe(-35);
    expect(round.effects.filter(e => e.status === 'disarmed')).toHaveLength(1);
  });

  it('raises an alert for the critical of a fumble', () => {
    const round = load({});
    round.addFumbleCriticalAlert('A', 'mainHand');

    expect(round.alerts.map(alert => alert.type)).toEqual(['critical']);
    expect(round.alerts[0].modifiers!.map(modifier => [modifier.key, modifier.modifier])).toEqual([
      ['origin', 'fumble'],
      ['criticalSeverity', 'A'],
      ['attackName', 'mainHand'],
    ]);
  });
});

describe('ActorRound alerts resolved by hand (workspace spec 034)', () => {
  it('resolves the critical alert of a fumble, not the alerts with a roll', () => {
    const round = load({});
    round.addFumbleCriticalAlert('B');
    round.alerts.push(ActorRoundAlert.buildEndurance());

    round.resolveAlert(round.alerts[0].id);

    expect(round.alerts[0].status).toBe('resolved');
    expect(() => round.resolveAlert(round.alerts[1].id)).toThrow(expect.objectContaining({ code: 'err-alert-not-resolvable' }));
    expect(() => round.resolveAlert('missing')).toThrow(NotFoundError);
  });
});
