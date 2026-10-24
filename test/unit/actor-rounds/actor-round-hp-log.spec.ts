import { describe, expect, it } from 'vitest';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round';
import { HpLog, HpLogEntry } from '../../../src/modules/actor-rounds/domain/value-objects/hp-log-entry.vo';
import { buildInjury } from '../../../src/modules/actor-rounds/domain/value-objects/injury.vo';
import { load } from './actor-round-test.factory';

const strip = (entries: HpLogEntry[]) => entries.map(({ id, at, ...rest }) => (expect(id).toBeTruthy(), expect(at).toBeTruthy(), rest));

describe('ActorRound hits log (spec 013, §1.1)', () => {
  it('logs the attack table damage and each critical apart, with the attack and the phase', () => {
    const round = load({ round: 3, hp: [50, 50] });
    const attacker = { actionId: 'action-1', attackerId: 'orc', attackerName: 'Orc' };

    round.applyAttackResults(
      13,
      [],
      undefined,
      { phase: 2, spentAp: 1 },
      [],
      [
        { kind: 'attack', amount: -10, ...attacker },
        { kind: 'critical', amount: -3, criticalKey: 'S-B-91', ...attacker },
      ],
    );

    expect(round.hp.current).toBe(37);
    expect(strip(round.hpLog)).toEqual([
      { round: 3, phase: 2, kind: 'attack', amount: -10, ...attacker },
      { round: 3, phase: 2, kind: 'critical', amount: -3, criticalKey: 'S-B-91', ...attacker },
    ]);
  });

  it('logs the damage no origin accounts for as a game master adjustment', () => {
    const round = load();

    round.applyAttackResults(8, [], undefined, undefined, [], [{ kind: 'attack', amount: -5 }]);

    expect(round.hpLog.map(e => [e.kind, e.amount])).toEqual([
      ['attack', -5],
      ['manual', -3],
    ]);
  });

  it('logs no entry for effects without damage', () => {
    const round = load();

    round.applyAttackResults(0, [], undefined);

    expect(round.hpLog).toEqual([]);
  });

  it('logs one bleeding entry per bleeding injury in the upkeep, with the attacker of the critical', () => {
    const source = { kind: 'critical' as const, attackerId: 'orc', attackerName: 'Orc', actionId: 'action-1', criticalKey: 'S-C-50' };
    const round = load({
      round: 2,
      hp: [50, 40],
      injuries: [
        buildInjury({ id: 'cut', type: 'cut-burn', penalty: -5, bleeding: 2, source }),
        buildInjury({ id: 'gash', type: 'cut-burn', penalty: 0, bleeding: 3, source: { kind: 'manual' } }),
        buildInjury({ id: 'bruise', type: 'bone', penalty: -10, source: { kind: 'manual' } }),
      ],
    });

    round.applyUpkeep();

    expect(round.hp.current).toBe(35);
    expect(strip(round.hpLog)).toEqual([
      {
        round: 2,
        phase: 5,
        kind: 'bleeding',
        amount: -2,
        injuryId: 'cut',
        actionId: 'action-1',
        attackerId: 'orc',
        attackerName: 'Orc',
        criticalKey: 'S-C-50',
      },
      { round: 2, phase: 5, kind: 'bleeding', amount: -3, injuryId: 'gash' },
    ]);
  });

  it('logs a game master adjustment with the hits actually healed (capped at the maximum)', () => {
    const round = load({ hp: [50, 45] });

    round.adjustHp(7, 1);
    round.adjustHp(-20, 1);

    expect(round.hp.current).toBe(50);
    expect(round.hpLog.map(e => [e.kind, e.amount, e.phase])).toEqual([
      ['manual', -7, 1],
      ['manual', 12, 1],
    ]);
  });

  it('logs no healing when the actor is at its maximum', () => {
    const round = load({ hp: [50, 50] });

    round.heal(5, { kind: 'treatment' });

    expect(round.hpLog).toEqual([]);
  });

  it('logs the hits of an endurance roll', () => {
    const round = load({ hp: [50, 50] });

    round.applyEnduranceResult(0, 4, undefined, undefined, 3);

    expect(round.hpLog.map(e => [e.kind, e.amount, e.phase])).toEqual([['endurance', -4, 3]]);
  });

  it('starts every round with an empty log, and reads older actor rounds without one as empty', () => {
    const round = load();
    round.adjustHp(5);

    expect(ActorRound.createFromPrevious(round).hpLog).toEqual([]);
    expect(ActorRound.fromProps({ ...round.getProps(), hpLog: undefined }).hpLog).toEqual([]);
  });

  it('totals a log by kind and by attacker', () => {
    const entry = (kind: HpLogEntry['kind'], amount: number, attackerId?: string): HpLogEntry => ({
      id: `${kind}${amount}`,
      round: 1,
      kind,
      amount,
      attackerId,
      attackerName: attackerId?.toUpperCase(),
      at: '',
    });

    const totals = HpLog.bySource([
      entry('attack', -10, 'orc'),
      entry('critical', -4, 'orc'),
      entry('attack', -6, 'troll'),
      entry('bleeding', -2, 'orc'),
      entry('treatment', 3),
    ]);

    expect(totals).toEqual({
      byKind: { attack: -16, critical: -4, bleeding: -2, treatment: 3 },
      byAttacker: [
        { attackerId: 'orc', attackerName: 'ORC', amount: -16 },
        { attackerId: 'troll', attackerName: 'TROLL', amount: -6 },
      ],
    });
  });
});
