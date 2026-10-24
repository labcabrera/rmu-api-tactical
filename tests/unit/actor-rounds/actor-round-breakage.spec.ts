import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.aggregate';
import { ActorRoundAlert } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-alert.vo';
import { ActorRoundDefense } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-defense.vo';
import { ActorRoundEffect } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-effect.vo';
import { ActorRoundItem, ItemModifier } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-item.vo';
import { ActorRoundShield } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-shield.vo';
import { BreakageResolver } from '../../../src/modules/actor-rounds/domain/services/breakage-resolver';
import { NotFoundError, ValidationError } from '../../../src/modules/shared/domain/errors';
import { attack, load } from './actor-round-test.factory';

const sword = (modifiers: ItemModifier[] = [], strength: number | null = 80): ActorRoundItem => ({
  itemId: 'sword',
  name: 'Broadsword',
  kind: 'weapon',
  slot: 'mainHand',
  strength,
  modifiers,
  startModifierIds: modifiers.map(modifier => modifier.id),
});

const shield = (): ActorRoundItem => ({
  itemId: 'shield',
  name: 'Shield',
  kind: 'shield',
  slot: 'offHand',
  strength: 60,
  modifiers: [],
  startModifierIds: [],
  baseValue: 20,
});

const legs = (): ActorRoundItem => ({
  itemId: 'greaves',
  name: 'Greaves',
  kind: 'armor',
  slot: 'legs',
  strength: 70,
  modifiers: [],
  startModifierIds: [],
  baseValue: 10,
});

const damage = (id: string, value: number, extra: Partial<ItemModifier> = {}): ItemModifier => ({
  id,
  type: 'breakage',
  value,
  appliesTo: 'all',
  createdAt: '2026-10-24T10:00:00.000Z',
  ...extra,
});

/** An actor with a sword in the main hand (OB 60), a shield (DB 20) and greaves (AT 10 on the legs, 1 elsewhere). */
const actor = (items: ActorRoundItem[] = [sword(), shield(), legs()]): ActorRound => {
  const swordAttack = attack('mainHand', 60);
  swordAttack.itemId = 'sword';
  const round = load({ attacks: [swordAttack], shield: new ActorRoundShield(20, 1, 0) });
  round.defense = new ActorRoundDefense(10, null, 1, 1, 1, 10, new ActorRoundShield(20, 1, 0), 0);
  round.initItems(items);
  return round;
};

describe('BreakageResolver', () => {
  it.each([
    [0, 'absolute-failure', 0, true],
    [1, 'failure', -20, false],
    [75, 'failure', -20, false],
    [76, 'partial-success', -10, false],
    [100, 'partial-success', -10, false],
    [101, 'success', 0, false],
    [175, 'success', 0, false],
    [176, 'absolute-success', 0, false],
  ])('a total of %s is %s', (total, result, damageValue, broken) => {
    const outcome = BreakageResolver.resolve({ roll: 50, modifiers: [{ key: 'strength', value: total - 50 }] });
    expect(outcome).toMatchObject({ total, result, damage: damageValue, broken, temporary: false });
  });

  it('an unmodified 66 on a failure leaves temporary damage', () => {
    expect(BreakageResolver.resolve({ roll: 66, modifiers: [{ key: 'strength', value: -10 }] })).toMatchObject({
      result: 'failure',
      unmodified66: true,
      damage: -20,
      temporary: true,
    });
  });

  it('an unmodified 66 on a success repairs up to 10 of the earlier damage', () => {
    expect(BreakageResolver.resolve({ roll: 66, modifiers: [{ key: 'strength', value: 50 }] }, -20).damage).toBe(10);
    expect(BreakageResolver.resolve({ roll: 66, modifiers: [{ key: 'strength', value: 50 }] }, -5).damage).toBe(5);
    expect(BreakageResolver.resolve({ roll: 66, modifiers: [{ key: 'strength', value: 50 }] }, 0).damage).toBe(0);
  });

  it('uses the unmodified roll of an open-ended one', () => {
    expect(BreakageResolver.resolve({ roll: 166, unmodifiedRoll: 96, modifiers: [] }).unmodified66).toBe(false);
    expect(BreakageResolver.resolve({ roll: 40, unmodifiedRoll: 66, modifiers: [] }).unmodified66).toBe(true);
  });

  it('requires a roll', () => {
    expect(() => BreakageResolver.resolve({ roll: Number.NaN, modifiers: [] })).toThrow(ValidationError);
  });
});

describe('ActorRound breakage', () => {
  it('a failure damages the weapon and lowers its current OB from then on', () => {
    const round = actor();
    const result = round.resolveBreakageCheck({ itemId: 'sword', roll: 40 });
    expect(result).toMatchObject({ total: 120, result: 'success' });
    const failure = round.resolveBreakageCheck({ itemId: 'sword', roll: -30 });
    expect(failure.result).toBe('failure');
    expect(failure.modifier).toMatchObject({
      type: 'breakage',
      value: -20,
      appliesTo: 'all',
      source: { kind: 'tactical', tacticalGameId: 'game-1' },
    });
    expect(round.attacks[0]).toMatchObject({ breakagePenalty: -20, currentBo: 40, broken: false });
  });

  it('adds the earlier damage, the quality and the game master modifiers to the total', () => {
    const quality: ItemModifier = { id: 'q', type: 'quality', value: 10, appliesTo: 'breakage', createdAt: '' };
    const round = actor([sword([damage('old', -20), quality])]);
    const result = round.resolveBreakageCheck({ itemId: 'sword', roll: 50, modifiers: [{ key: 'gm', value: -5 }] });
    expect(result.breakdown).toEqual([
      { key: 'strength', value: 80 },
      { key: 'quality', value: 10 },
      { key: 'item-damage', value: -20 },
      { key: 'gm', value: -5 },
    ]);
    expect(result.total).toBe(115);
    // The damage it brought is already in its base OB.
    expect(round.attacks[0].breakagePenalty).toBe(0);
  });

  it('an absolute failure breaks the weapon', () => {
    const round = actor();
    round.resolveBreakageCheck({ itemId: 'sword', roll: -100 });
    expect(round.attacks[0].broken).toBe(true);
  });

  it('a damaged shield loses DB and a broken one is gone', () => {
    const round = actor();
    round.resolveBreakageCheck({ itemId: 'shield', roll: -10 });
    expect(round.defense.shield?.db).toBe(0);
    round.resolveBreakageCheck({ itemId: 'shield', roll: -200 });
    expect(round.defense.shield).toBeNull();
  });

  it('armor beyond -50 leaves its area unprotected, and counts as a maneuver penalty', () => {
    const round = actor();
    expect(round.defense.legsAt).toBe(10);
    [-40, -20, 0].forEach(roll => round.resolveBreakageCheck({ itemId: 'greaves', roll }));
    expect(round.items.find(item => item.itemId === 'greaves')!.modifiers.some(modifier => modifier.broken)).toBe(false);
    expect(round.getArmorBreakagePenalty()).toBe(-60);
    expect(round.defense.at).toBe(1);
  });

  it('requires a strength and a known item', () => {
    const round = actor([sword([], null)]);
    expect(() => round.resolveBreakageCheck({ itemId: 'sword', roll: 50 })).toThrow(ValidationError);
    expect(round.resolveBreakageCheck({ itemId: 'sword', roll: 50, strength: 60 }).total).toBe(110);
    expect(() => round.resolveBreakageCheck({ itemId: 'axe', roll: 50 })).toThrow(NotFoundError);
  });

  it('resolves its alert with the penalty of the critical, once', () => {
    const round = actor();
    round.applyAttackResults(0, [new ActorRoundEffect('e1', 'breakage_roll', -25, undefined)], 'legs');
    const alert = round.alerts.find(each => each.type === 'breakage')!;
    expect(alert.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'origin', modifier: 'critical' }),
        expect.objectContaining({ key: 'penalty', value: -25 }),
        expect.objectContaining({ key: 'itemId', modifier: 'greaves' }),
      ]),
    );
    expect(alert.modifiers!.filter(each => each.key === 'candidate').map(each => each.modifier)).toEqual(['greaves', 'shield', 'sword']);
    const result = round.resolveBreakageCheck({ itemId: 'greaves', roll: 50, alertId: alert.id });
    expect(result.breakdown).toContainEqual({ key: 'origin', value: -25 });
    expect(alert.status).toBe('resolved');
    expect(() => round.resolveBreakageCheck({ itemId: 'greaves', roll: 50, alertId: alert.id })).toThrow(ValidationError);
    expect(() => round.resolveBreakageCheck({ itemId: 'greaves', roll: 50, alertId: 'other' })).toThrow(NotFoundError);
  });

  it('a fumble asks for the check of the item of its attack', () => {
    const round = actor();
    const fumble = new ActorRoundEffect('e1', 'breakage_roll', 0, undefined, undefined, undefined, undefined, undefined, {
      kind: 'fumble',
    });
    round.applyAttackResults(0, [fumble], undefined, undefined, [], [], 'mainHand');
    const alert = round.alerts.find(each => each.type === 'breakage')!;
    expect(alert.getModifierValue('penalty')).toBeUndefined();
    expect(alert.modifiers).toContainEqual(expect.objectContaining({ key: 'origin', modifier: 'fumble' }));
    expect(alert.modifiers).toContainEqual(expect.objectContaining({ key: 'itemId', modifier: 'sword' }));
  });

  it('a 33 or 77 asks for the check of the item of the attack', () => {
    const round = actor();
    round.addAttackBreakageAlert('mainHand');
    expect(round.alerts[0].modifiers).toContainEqual(expect.objectContaining({ key: 'itemId', modifier: 'sword' }));
  });

  it('keeps the items and their damage in the next round', () => {
    const round = actor();
    round.resolveBreakageCheck({ itemId: 'sword', roll: -30 });
    const next = ActorRound.createFromPrevious(round);
    expect(next.items.find(item => item.itemId === 'sword')!.modifiers).toHaveLength(1);
    expect(next.attacks[0].currentBo).toBe(40);
    const stored = ActorRound.fromProps(next.getProps());
    expect(stored.items).toEqual(next.items);
  });

  it('reads stored alerts as instances', () => {
    const stored = ActorRound.fromProps({
      ...load().getProps(),
      alerts: [
        {
          id: 'a',
          type: 'breakage',
          message: 'm',
          modifiers: [{ key: 'penalty', value: -10, modifier: null }],
          status: 'pending',
        } as ActorRoundAlert,
      ],
    });
    expect(stored.alerts[0].getModifierValue('penalty')).toBe(-10);
  });
});
