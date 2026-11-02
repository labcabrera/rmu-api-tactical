import { describe, expect, it } from 'vitest';
import type { ActorRoundItem } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-item.vo.js';
import { ActorRoundItemDto } from '../../../src/modules/actor-rounds/interfaces/http/dto/actor-round-item.dto.js';

const dagger = (props: Partial<ActorRoundItem> = {}): ActorRoundItem => ({
  itemId: 'dagger-1',
  name: 'Dagger',
  itemTypeId: 'dagger',
  kind: 'weapon',
  slot: 'mainHand',
  strength: 70,
  modifiers: [],
  startModifierIds: [],
  ...props,
});

// Spec 056: the round sends the coating of its weapons, so the sheet can show it
describe('ActorRoundItemDto', () => {
  it('sends the coating of a weapon', () => {
    const coating = { itemTypeId: 'venom', name: 'Venom', poison: {} as never, appliedAt: '2026-10-31T10:00:00.000Z', hoursLeft: 2 };

    const dto = ActorRoundItemDto.fromEntity(dagger({ coating }));

    expect(dto.coating).toEqual(coating);
    expect(dto.coating).not.toBe(coating);
    expect(dto.coatingSpent).toBeUndefined();
  });

  it('sends a spent coating by its appliedAt, and the legacy true of an older round', () => {
    const spent = ActorRoundItemDto.fromEntity(dagger({ coating: null, coatingSpent: { appliedAt: '2026-10-31T10:00:00.000Z' } }));
    const legacy = ActorRoundItemDto.fromEntity(dagger({ coating: null, coatingSpent: true }));

    expect(spent).toMatchObject({ coating: null, coatingSpent: { appliedAt: '2026-10-31T10:00:00.000Z' } });
    expect(legacy.coatingSpent).toBe(true);
  });

  it('leaves both out for an item without a coating', () => {
    const dto = ActorRoundItemDto.fromEntity(dagger());

    expect('coating' in dto).toBe(false);
    expect('coatingSpent' in dto).toBe(false);
  });
});
