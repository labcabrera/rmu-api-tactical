import { describe, expect, it, vi } from 'vitest';
import type { AttackTableLookupRequest } from '../../../../src/modules/actions/application/ports/attack-table.port.js';
import {
  COMBAT_PLUGIN_LIST,
  CombatAttackRollResolverService,
  CombatPluginRegistryService,
  CombatProcessor,
} from '../../../../src/modules/actions/application/services/combat/index.js';
import { ActionAttackCalculated } from '../../../../src/modules/actions/domain/value-objects/action-attack-calculated.vo.js';
import { AttackTableEntry } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { KeyValueModifier } from '../../../../src/modules/actions/domain/value-objects/key-value-modifier.vo.js';
import { ValidationError } from '../../../../src/modules/shared/domain/errors/errors.js';
import { createCombatPluginContext, type CombatPluginContextOptions } from './combat-plugin-test.factory.js';

const setup = (entry: AttackTableEntry, options: CombatPluginContextOptions = {}) => {
  const ctx = createCombatPluginContext(options);
  ctx.attack!.calculated = new ActionAttackCalculated(
    [new KeyValueModifier('bo', 80, 'offense', 'offensive-bonus'), new KeyValueModifier('bd', -20, 'defense', 'defensive-bonus')],
    60,
    undefined,
    undefined,
    [],
  );
  const lookup = vi.fn((request: AttackTableLookupRequest) => {
    void request;
    return Promise.resolve(new AttackTableEntry(entry.text, entry.damage, entry.criticalType, entry.criticalSeverity));
  });
  const processor = new CombatProcessor(new CombatPluginRegistryService(COMBAT_PLUGIN_LIST));
  const resolver = new CombatAttackRollResolverService(processor, { lookup });
  const resolve = (roll: number, unmodified?: number) =>
    resolver.resolve({
      action: ctx.action,
      attack: ctx.attack!,
      sourceActor: ctx.sourceActor!,
      targetActor: ctx.targetActor!,
      roll,
      unmodified,
    });
  return { ctx, attack: ctx.attack!, action: ctx.action, lookup, resolve };
};

describe('CombatAttackRollResolverService', () => {
  it('adds the roll to the prepared modifiers and looks the total up with the target armour', async () => {
    const { attack, action, lookup, resolve } = setup(new AttackTableEntry('8', 8, undefined, undefined), { defense: { at: 4 } });

    await resolve(50);

    expect(lookup).toHaveBeenCalledWith(expect.objectContaining({ attackTable: 'arming-sword', roll: 110, armor: 4 }));
    expect(attack.roll?.roll).toBe(50);
    expect(attack.calculated?.rollTotal).toBe(110);
    expect(attack.results?.attackTableEntry?.damage).toBe(8);
    expect(attack.results?.criticals).toBeUndefined();
    expect(attack.status).toBe('pending_apply');
    expect(action.status).toBe('pending_apply');
  });

  it('passes totals out of the table range unchanged: the adapter clamps them', async () => {
    const { lookup, resolve } = setup(new AttackTableEntry('0', 0, undefined, undefined));

    await resolve(150);

    expect(lookup).toHaveBeenCalledWith(expect.objectContaining({ roll: 210 }));
  });

  it('uses the torso armour of a target with mixed armour without a called shot, rolling no location (§9.7)', async () => {
    const { attack, lookup, resolve } = setup(new AttackTableEntry('8', 8, undefined, undefined), {
      defense: { at: null, headAt: 2, bodyAt: 6, armsAt: 3, legsAt: 4 },
    });

    await resolve(50);

    expect(attack.calculated?.location).toBeUndefined();
    expect(lookup).toHaveBeenCalledWith(expect.objectContaining({ armor: 6, location: undefined }));
  });

  it('uses the armour of a called location', async () => {
    const { attack, lookup, resolve } = setup(new AttackTableEntry('8', 8, undefined, undefined), {
      calledShot: 'head',
      defense: { at: null, headAt: 2, bodyAt: 6, armsAt: 3, legsAt: 4 },
    });

    await resolve(50);

    expect(attack.calculated?.location).toBe('head');
    expect(lookup).toHaveBeenCalledWith(expect.objectContaining({ armor: 2 }));
  });

  it('creates one pending critical for an A..E result', async () => {
    const { attack, action, resolve } = setup(new AttackTableEntry('12CS', 12, 'S', 'C'));

    await resolve(50);

    expect(attack.results?.criticals?.map(critical => [critical.key, critical.criticalSeverity, critical.status])).toEqual([
      ['s_c_1', 'C', 'pending_roll'],
    ]);
    expect(Array.from(attack.roll!.criticalRolls!.entries())).toEqual([['s_c_1', undefined]]);
    expect(attack.status).toBe('pending_critical_roll');
    expect(action.status).toBe('pending_roll');
  });

  it('splits an F..J result into several criticals', async () => {
    const { attack, resolve } = setup(new AttackTableEntry('25IK', 25, 'K', 'I'));

    await resolve(50);

    expect(attack.results?.criticals?.map(critical => critical.key)).toEqual(['k_e_1', 'k_c_2', 'k_a_3']);
  });

  it('applies the attack size to the severity, not to the damage, before splitting the criticals', async () => {
    const { attack, resolve } = setup(new AttackTableEntry('10ES', 10, 'S', 'E'), { attackSize: 1 });

    await resolve(50);

    expect(attack.results?.attackTableEntry).toMatchObject({ damage: 10, criticalSeverity: 'F' });
    expect(attack.results?.criticals?.map(critical => critical.criticalSeverity)).toEqual(['E', 'A']);
  });

  it('adds the absolute hit to the critical modifiers and the critical adjustment', async () => {
    const { attack, resolve } = setup(new AttackTableEntry('30EK', 30, 'K', 'E'));
    attack.calculated!.criticalModifiers = [new KeyValueModifier('size-difference', 1, 'situation', 'size-difference')];

    await resolve(130);

    expect(attack.calculated?.rollTotal).toBe(190);
    expect(attack.calculated?.criticalModifiers?.map(modifier => [modifier.key, modifier.value])).toEqual([
      ['size-difference', 1],
      ['absolute-hit', 3],
    ]);
    expect(attack.calculated?.criticalAdjustment).toBe(4);
  });

  it('replaces the results of a previous roll', async () => {
    const { attack, resolve } = setup(new AttackTableEntry('30EK', 30, 'K', 'E'));

    await resolve(130);
    await resolve(77);

    expect(attack.calculated?.criticalModifiers).toEqual([]);
    expect(attack.calculated?.criticalAdjustment).toBeUndefined();
    expect(attack.calculated?.breakageRoll).toBe(true);
    expect(attack.calculated?.rollTotal).toBe(137);
  });

  it('marks a fumble as pending without looking up the attack table', async () => {
    const { attack, action, lookup, resolve } = setup(new AttackTableEntry('8', 8, undefined, undefined), { fumble: 4 });

    await resolve(4);

    expect(lookup).not.toHaveBeenCalled();
    expect(attack.roll?.roll).toBe(4);
    expect(attack.results?.attackTableEntry).toBeUndefined();
    expect(attack.results?.fumble?.status).toBe('pending_roll');
    expect(attack.status).toBe('pending_fumble_roll');
    expect(action.status).toBe('pending_roll');
  });

  it('decides the fumble with the unmodified die, not the open-ended total (spec 056, B-01)', async () => {
    const { attack, lookup, resolve } = setup(new AttackTableEntry('8', 8, undefined, undefined), { fumble: 3 });

    await resolve(-54, 4);

    expect(attack.results?.fumble).toBeUndefined();
    expect(lookup).toHaveBeenCalledWith(expect.objectContaining({ roll: 6 }));
    expect(attack.roll).toMatchObject({ roll: -54, unmodified: 4 });
  });

  it('fumbles on an unmodified die inside the range whatever the total', async () => {
    const { attack, lookup, resolve } = setup(new AttackTableEntry('8', 8, undefined, undefined), { fumble: 3 });

    await resolve(2, 2);

    expect(lookup).not.toHaveBeenCalled();
    expect(attack.results?.fumble?.status).toBe('pending_roll');
    expect(attack.roll?.unmodified).toBe(2);
  });

  it('rejects a total below 1 without the unmodified die: the attack is only open-ended upwards', async () => {
    const { lookup, resolve } = setup(new AttackTableEntry('8', 8, undefined, undefined), { fumble: 3 });

    await expect(resolve(-54)).rejects.toMatchObject({ statusCode: 400, code: 'validation' });
    await expect(resolve(0)).rejects.toBeInstanceOf(ValidationError);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('keeps the action pending while another attack has not been rolled', async () => {
    const { ctx, action, resolve } = setup(new AttackTableEntry('8', 8, undefined, undefined));
    const other = createCombatPluginContext().attack!;
    other.attackName = 'offHand';
    action.attacks = [ctx.attack!, other];

    await resolve(50);

    expect(ctx.attack!.status).toBe('pending_apply');
    expect(other.status).toBe('pending_attack_roll');
    expect(action.status).toBe('pending_roll');
  });
});
