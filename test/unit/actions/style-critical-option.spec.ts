import { describe, expect, it } from 'vitest';
import { applyStyleCriticalOption, checkStyleCriticalOption } from '../../../src/modules/actions/domain/services/style-critical-option.js';
import type { ActorRoundActiveStyle } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-fighting-style.vo.js';
import { Critical } from '../../../src/modules/actions/domain/value-objects/critical.vo.js';

const criticals = () => [
  new Critical('k_e_1', 'pending_roll', 'K', 'E', undefined, undefined),
  new Critical('k_b_2', 'pending_roll', 'K', 'B', undefined, undefined),
];

const style = (abilityId: string, attackNames: string[] | null = null): ActorRoundActiveStyle => ({
  skillId: 'battle-styles',
  styleId: 'made-up',
  met: true,
  attackNames: null,
  freeRanksBonus: 0,
  abilities: [{ abilityId, times: 1, met: true, attackNames }],
  warnings: [],
  options: [],
});

describe('fighting style critical options (workspace spec 032, group C)', () => {
  it('lowers the severity of the first critical one step and records what it was', () => {
    const list = criticals();
    applyStyleCriticalOption(list, 'leg-sweep');
    expect(list.map(c => c.criticalSeverity)).toEqual(['D', 'B']);
    expect(list[0].styleOption).toEqual({ abilityId: 'leg-sweep', originalType: 'K', originalSeverity: 'E' });
  });

  it('keeps an A critical as A', () => {
    const list = [new Critical('k_a_1', 'pending_roll', 'K', 'A', undefined, undefined)];
    applyStyleCriticalOption(list, 'redirect');
    expect(list[0].criticalSeverity).toBe('A');
  });

  it('changes the type of every critical without lowering them', () => {
    const list = criticals();
    applyStyleCriticalOption(list, 'binding-chain');
    expect(list.map(c => `${c.criticalType}${c.criticalSeverity}`)).toEqual(['GE', 'GB']);
    const other = criticals();
    applyStyleCriticalOption(other, 'overbearing');
    expect(other.map(c => c.criticalType)).toEqual(['U', 'U']);
  });

  it('accepts only options of the active style that work with the attack', () => {
    expect(() => checkStyleCriticalOption(style('leg-sweep'), 'mainHand', 'leg-sweep')).not.toThrow();
    expect(() => checkStyleCriticalOption(style('leg-sweep', ['offHand']), 'mainHand', 'leg-sweep')).toThrow(/does not give/);
    expect(() => checkStyleCriticalOption(style('leg-sweep'), 'mainHand', 'weapon-breaker')).toThrow(/does not give/);
    expect(() => checkStyleCriticalOption(style('killing-strike'), 'mainHand', 'killing-strike')).toThrow(/does not give/);
    expect(() => checkStyleCriticalOption(null, 'mainHand', 'leg-sweep')).toThrow(/does not give/);
  });
});
