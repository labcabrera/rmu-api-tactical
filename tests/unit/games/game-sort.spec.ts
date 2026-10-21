import { describe, expect, it } from '@jest/globals';
import { GAME_SORTS, toGameMongoSort } from '../../../src/modules/games/domain/value-objects/game-sort.vo';

describe('toGameMongoSort', () => {
  it('sorts ascending by a field and descending with a leading dash, with the id as tiebreak', () => {
    expect(toGameMongoSort('name')).toEqual({ name: 1, _id: 1 });
    expect(toGameMongoSort('-createdAt')).toEqual({ createdAt: -1, _id: 1 });
  });

  it('keeps the default order without a sort or with an unknown field', () => {
    expect(toGameMongoSort(undefined)).toBeUndefined();
    expect(toGameMongoSort('-owner')).toBeUndefined();
  });

  it('accepts name and createdAt in both directions', () => {
    expect(GAME_SORTS).toEqual(['name', '-name', 'createdAt', '-createdAt']);
  });
});
