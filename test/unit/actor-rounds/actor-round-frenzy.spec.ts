import { describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundEffect } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import type { ActorRoundActiveStyle } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-fighting-style.vo.js';
import { ActorRoundTrait } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { UnprocessableEntityError, ValidationError } from '../../../src/modules/shared/domain/errors/errors.js';
import { attack, effect, load } from './actor-round-test.factory.js';

const statuses = (round: ActorRound) => round.effects.map(e => e.status).sort();

const hpPenalty = (round: ActorRound) => round.getPenaltiesBySource().find(p => p.source === 'hp')?.value ?? 0;

/** Max 50 hits, death threshold 20 (Body Development). */
const frenzied = (current = 50, level = 1) => {
  const round = load({ hp: [50, current, 20], attacks: [attack('mainHand', 60)] });
  round.enterFrenzy(level);
  return round;
};

const ragingWindStyle = (): ActorRoundActiveStyle => ({
  skillId: 'battle-styles',
  styleId: 'berserker',
  met: true,
  attackNames: null,
  freeRanksBonus: 0,
  abilities: [{ abilityId: 'raging-wind', times: 1, met: true, attackNames: null }],
  warnings: [],
  options: [],
});

describe('Natural Haste (spec 040, decisions 1-2)', () => {
  it('adds its tier to the AP of every round', () => {
    const round = load({ traits: [new ActorRoundTrait('natural-haste', 2, null)] });
    expect(round.apModifiers).toContainEqual(expect.objectContaining({ source: 'natural-haste', kind: 'bonus', value: 2 }));
    expect(round.totalCapacity()).toBe(6);
    const next = ActorRound.createFromPrevious(round);
    expect(next.totalCapacity()).toBe(6);
  });

  it('adds up with haste', () => {
    const round = load({ traits: [new ActorRoundTrait('natural-haste', 1, null)] });
    round.applyAttackResults(0, [effect('haste', 2)], undefined);
    expect(round.totalCapacity()).toBe(7);
  });
});

describe('Frenzy hits (spec 040, decisions 12 and 14)', () => {
  it('has no hits penalty while it lasts, and gets it back when it ends', () => {
    const round = frenzied(10);
    round.adjustHp(0);
    expect(hpPenalty(round)).toBe(0);
    round.leaveFrenzy();
    expect(hpPenalty(round)).toBe(-30);
  });

  it('fights on below 0 hits', () => {
    const round = frenzied(5);
    round.adjustHp(15);
    expect(round.hp.current).toBe(-10);
    expect(statuses(round)).toEqual(['frenzy']);
  });

  it('falls unconscious at the death threshold and the frenzy ends', () => {
    const round = frenzied(5);
    round.adjustHp(25);
    expect(statuses(round)).toEqual(['unconscious']);
  });

  it('is dying in frenzy beyond the threshold instead of dead', () => {
    const round = frenzied(5);
    round.adjustHp(40);
    expect(statuses(round)).toEqual(['frenzy-dying', 'unconscious']);
    expect(round.isDead()).toBe(false);
    expect(round.isAtRisk()).toBe(true);
    round.applyUpkeep();
    expect(round.isDead()).toBe(false);
  });

  it('dies when the physical RR fails, and stays dying when resisted', () => {
    const round = frenzied(5);
    round.adjustHp(40);
    round.resolveFrenzyDyingRr(true);
    expect(statuses(round)).toEqual(['frenzy-dying', 'unconscious']);
    round.resolveFrenzyDyingRr(false);
    expect(statuses(round)).toEqual(['dead', 'unconscious']);
  });

  it('is no longer dying once healed back to the threshold', () => {
    const round = frenzied(5);
    round.adjustHp(40);
    round.heal(15);
    expect(round.hp.current).toBe(-20);
    expect(statuses(round)).toEqual(['unconscious']);
  });

  it('rejects the RR of an actor that is not dying in frenzy', () => {
    expect(() => frenzied().resolveFrenzyDyingRr(true)).toThrow(UnprocessableEntityError);
  });

  it('falls unconscious when it leaves the frenzy below 1 hit', () => {
    const round = frenzied(5);
    round.adjustHp(10);
    round.leaveFrenzy();
    expect(statuses(round)).toEqual(['unconscious']);
  });

  it('ends with an unconsciousness of a critical', () => {
    const round = frenzied();
    round.applyAttackResults(0, [effect('unconscious')], undefined);
    expect(round.frenzyLevel()).toBe(0);
  });
});

describe('Frenzy state (spec 040, decisions 7, 13 and 16)', () => {
  it('keeps one frenzy, of level 1 or 2', () => {
    const round = frenzied();
    round.enterFrenzy(2);
    expect(round.effects.filter(e => e.status === 'frenzy')).toHaveLength(1);
    expect(round.frenzyLevel()).toBe(2);
    expect(() => round.enterFrenzy(3)).toThrow(ValidationError);
  });

  it('cannot parry', () => {
    const round = frenzied();
    expect(round.isParryForbidden()).toBe(true);
    expect(round.getAvailableParry()).toBe(0);
  });

  it('goes on into the next round', () => {
    expect(ActorRound.createFromPrevious(frenzied(50, 2)).frenzyLevel()).toBe(2);
  });

  it('gives Raging Wind +5 initiative when the round starts in frenzy', () => {
    const previous = load({ round: 1 });
    previous.enterFrenzy(1, { phase: 2, spentAp: 1 });
    const round = ActorRound.createFromPrevious(previous);
    round.activeStyle = ragingWindStyle();
    round.declareInitiative(10);
    expect(round.initiative.style).toBe(5);
    expect(round.initiative.total).toBe(15);
  });

  it('gives no Raging Wind bonus to a frenzy entered in this round', () => {
    const round = load({ round: 2 });
    round.enterFrenzy(1, { phase: 2, spentAp: 1 });
    round.activeStyle = ragingWindStyle();
    round.declareInitiative(10);
    expect(round.initiative.style).toBeUndefined();
  });

  it('gives no Raging Wind bonus outside frenzy', () => {
    const round = load({ effects: [new ActorRoundEffect(randomUUID(), 'haste', 1, 2)] });
    round.activeStyle = ragingWindStyle();
    round.declareInitiative(10);
    expect(round.initiative.style).toBeUndefined();
  });
});
