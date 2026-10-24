import { describe, expect, it } from 'vitest';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.aggregate';
import { InjuryTypeResolver } from '../../../src/modules/actor-rounds/domain/services/injury-type.resolver';
import { ActorRoundEffect } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-effect.vo';
import { buildInjury, deriveInjurySeverity, Injury } from '../../../src/modules/actor-rounds/domain/value-objets/injury.vo';
import { effect, load } from './actor-round-test.factory';

const injury = (penalty: number, bleeding = 0, overrides: Partial<Injury> = {}): Injury => ({
  ...buildInjury({ id: `injury-${penalty}-${bleeding}`, type: 'cut-burn', penalty, bleeding, source: { kind: 'critical' } }),
  ...overrides,
});

const injuryPenalty = (round: ActorRound) => round.getPenaltiesBySource().find(p => p.source === 'injury')?.value ?? 0;

describe('Injury severity (spec 013, §1)', () => {
  it.each([
    [0, 0, 'light'],
    [-20, 0, 'light'],
    [-21, 0, 'medium'],
    [-40, 3, 'medium'],
    [-41, 0, 'severe'],
    [-5, 4, 'medium'],
    [0, 7, 'severe'],
  ])('penalty %i and bleeding %i is %s', (penalty, bleeding, severity) => {
    expect(deriveInjurySeverity(penalty, bleeding)).toBe(severity);
  });
});

describe('InjuryTypeResolver (spec 013, §2.3)', () => {
  it.each([
    ['S', undefined, 'cut-burn'],
    ['H', undefined, 'cut-burn'],
    ['acid', undefined, 'cut-burn'],
    ['K', undefined, 'bone'],
    ['U', undefined, 'bone'],
    ['I', undefined, 'bone'],
    ['T', undefined, 'bone'],
    ['P', 'chest', 'organ'],
    ['P', 'abdomen', 'organ'],
    ['P', 'leg', 'muscle-tendon'],
    ['G', undefined, 'muscle-tendon'],
    ['W', undefined, 'muscle-tendon'],
    ['subdual', undefined, 'skin-tissue'],
    ['holy', undefined, 'unknown'],
    [undefined, undefined, 'unknown'],
  ])('infers %s at %s as %s', (criticalType, location, type) => {
    expect(InjuryTypeResolver.resolve(criticalType, location as never)).toBe(type);
  });

  it('takes the type of the critical data when it is a known one', () => {
    expect(InjuryTypeResolver.resolve('S', 'arm', 'bone')).toBe('bone');
    expect(InjuryTypeResolver.resolve('S', 'arm', 'nonsense')).toBe('cut-burn');
  });
});

describe('ActorRound injuries (spec 013, §3)', () => {
  it('sums the penalties of the active, recovering and permanent injuries as the injury penalty', () => {
    const round = load({
      injuries: [
        injury(-10),
        injury(-5, 0, { id: 'b', status: 'recovering' }),
        injury(-20, 0, { id: 'c', status: 'permanent' }),
        injury(-30, 0, { id: 'd', status: 'healed' }),
      ],
    });

    expect(injuryPenalty(round)).toBe(-35);
    expect(round.getPenaltySum()).toBe(-35);
  });

  it('turns a penalty or bleeding effect of the game master into a manual injury', () => {
    const round = load({});

    round.applyAttackResults(0, [effect('penalty', -15), effect('bleeding', 2)], 'legs');

    expect(round.effects).toEqual([]);
    expect(round.injuries.map(i => [i.type, i.penalty, i.bleeding, i.location, i.source.kind])).toEqual([
      ['unknown', -15, undefined, 'leg', 'manual'],
      ['unknown', 0, 2, 'leg', 'manual'],
    ]);
    expect(injuryPenalty(round)).toBe(-15);
  });

  it('reads legacy bleeding effects, critical penalties and unconcious as injuries and unconscious, with stable ids', () => {
    const legacy = load({ penalties: [['critical', -10]], effects: [effect('bleeding', 3), effect('unconcious')] });
    const again = ActorRound.fromProps(legacy.getProps());

    expect(legacy.effects.map(e => e.status)).toEqual(['unconscious']);
    expect(legacy.injuries.map(i => [i.bleeding ?? 0, i.penalty])).toEqual([
      [3, 0],
      [0, -10],
    ]);
    expect(legacy.penalty.modifiers.some(m => m.source === 'critical')).toBe(false);
    expect(again.injuries.map(i => i.id)).toEqual(legacy.injuries.map(i => i.id));
    expect(injuryPenalty(again)).toBe(-10);
  });

  it('bleeds the injuries in the upkeep, and not the stopped or healed ones', () => {
    const round = load({
      hp: [50, 30],
      injuries: [injury(0, 3), injury(-5, 2, { id: 'stopped', bleeding: 0 }), injury(0, 4, { id: 'healed', status: 'healed' })],
    });

    round.applyUpkeep();

    expect(round.hp.current).toBe(27);
  });

  it('bleeds an actor down to unconsciousness in the upkeep', () => {
    const round = load({ hp: [50, 2], injuries: [injury(0, 3)] });

    round.applyUpkeep();

    expect(round.effects.map(e => e.status)).toEqual(['unconscious']);
  });

  it('copies the injuries into the next round', () => {
    const round = load({ injuries: [injury(-10, 2)] });

    const next = ActorRound.createFromPrevious(round);

    expect(next.injuries.map(i => i.id)).toEqual(round.injuries.map(i => i.id));
    expect(injuryPenalty(next)).toBe(-10);
    next.injuries[0].bleeding = 0;
    expect(round.injuries[0].bleeding).toBe(2);
  });

  it('edits and removes an injury, and fails for an unknown one', () => {
    const round = load({ injuries: [injury(-10, 0)] });
    const id = round.injuries[0].id;

    round.updateInjury(id, { penalty: -45, description: 'Broken arm' });
    expect(round.injuries[0]).toEqual(expect.objectContaining({ penalty: -45, severity: 'severe', description: 'Broken arm' }));
    expect(injuryPenalty(round)).toBe(-45);

    round.deleteInjury(id);
    expect(round.injuries).toEqual([]);
    expect(injuryPenalty(round)).toBe(0);
    expect(() => round.deleteInjury(id)).toThrow(expect.objectContaining({ errorCode: 'err-injury-not-found' }));
  });

  it('is at risk when bleeding or dying, and not when dead', () => {
    expect(load({ injuries: [injury(0, 1)] }).isAtRisk()).toBe(true);
    expect(load({ effects: [effect('dying', undefined, 3)] }).isAtRisk()).toBe(true);
    expect(load({ injuries: [injury(0, 1)], effects: [effect('dead')] }).isAtRisk()).toBe(false);
    expect(load({ injuries: [injury(-10, 0)] }).isAtRisk()).toBe(false);
  });
});

describe('ActorRound hits adjustment (spec 013, §9.7)', () => {
  it('heals up to the maximum and wakes an actor brought over 0 hits', () => {
    const round = load({ hp: [50, 5] });
    round.adjustHp(10);
    expect(round.hp.current).toBe(-5);
    expect(round.effects.map(e => e.status)).toEqual(['unconscious']);

    round.adjustHp(-100);

    expect(round.hp.current).toBe(50);
    expect(round.effects).toEqual([]);
  });

  it('keeps an unconsciousness of a critical', () => {
    const critical = new ActorRoundEffect('ko', 'unconscious', undefined, undefined, 1, 1, 0, undefined, { kind: 'critical' });
    const round = load({ hp: [50, 20], effects: [critical] });

    round.adjustHp(-10);

    expect(round.hp.current).toBe(30);
    expect(round.effects.map(e => e.id)).toEqual(['ko']);
  });

  it('heals the attacker up to its maximum', () => {
    const round = load({ hp: [50, 48] });
    round.heal(5);
    expect(round.hp.current).toBe(50);
  });
});

describe('ActorRound stabilize (spec 013, §3)', () => {
  it('adds rounds to a dying effect and rejects other effects', () => {
    const dying = effect('dying', undefined, 2);
    const stunned = effect('stunned', -25, 1);
    const round = load({ effects: [dying, stunned] });

    round.stabilize(dying.id, 2);

    expect(round.effects.find(e => e.id === dying.id)!.rounds).toBe(4);
    expect(() => round.stabilize(stunned.id, 1)).toThrow(expect.objectContaining({ errorCode: 'err-effect-not-dying' }));
  });
});
