import { describe, expect, it, vi } from 'vitest';
import { ResolveBreakageCheckCommand } from '../../../src/modules/actor-rounds/application/cqrs/commands/resolve-breakage-check.command.js';
import { ResolveBreakageCheckHandler } from '../../../src/modules/actor-rounds/application/cqrs/handlers/resolve-breakage-check.handler.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundCharacterMapperAdapter } from '../../../src/modules/actor-rounds/infrastructure/mappers/actor-round-character-mapper.adapter.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import type { Character } from '../../../src/modules/strategic/application/ports/character.port.js';
import type { StrategicItem } from '../../../src/modules/strategic/application/ports/item.port.js';

const character = (): Character =>
  ({
    id: 'character-1',
    gameId: 'sg-1',
    faction: { id: 'faction-1' },
    name: 'Kirax',
    info: { raceName: 'Human', raceId: 'human', sizeId: 'medium' },
    experience: { level: 3 },
    movement: { baseMovementRate: 20, maxPace: 'dash' },
    defense: {
      defensiveBonus: 10,
      armor: { at: null, bodyAt: 9, headAt: 1, armsAt: 1, legsAt: 1 },
      shield: { db: 20, blockCount: 1 },
      protect: 0,
    },
    hp: { max: 50, current: 50 },
    initiative: { totalBonus: 5 },
    skills: [],
    traits: [],
    items: [],
    equipment: {
      slots: { mainHand: 'sword', offHand: 'shield', body: 'mail' },
      maneuverPenalty: 0,
      encumbrancePenalty: 0,
      movementBaseDifficulty: 'm',
    },
    attacks: [
      {
        attackName: 'mainHand',
        attackTable: 'arming-sword',
        sizeAdjustment: 0,
        fumble: 3,
        bo: 60,
        type: 'melee',
        meleeRange: 1,
        ranges: null,
        fumbleTable: 'melee-one-hand',
        skillId: 'melee-weapon@blade',
      },
    ],
    imageUrl: undefined,
    owner: 'owner',
  }) as unknown as Character;

const item = (id: string, props: Partial<StrategicItem>): StrategicItem => ({
  id,
  characterId: 'character-1',
  itemTypeId: id,
  name: id,
  category: 'weapon',
  carried: true,
  weapon: null,
  armor: null,
  shield: null,
  info: { strength: 80, stackable: false },
  ...props,
});

const ITEMS: StrategicItem[] = [
  item('sword', { weapon: {}, modifiers: [{ id: 'm-1', type: 'breakage', value: -10, appliesTo: 'all', createdAt: '' }] }),
  item('shield', { shield: { db: 20, blockCount: 1 } }),
  item('mail', { armor: { slot: 'body', at: 9 } }),
  item('rope', { category: 'other' }),
  item('coins', { info: { stackable: true } }),
  item('spare', { carried: false }),
];

describe('Items of the actor', () => {
  it('takes the equipped and the carried items with their slot, strength, modifiers and base value', () => {
    const round = new ActorRoundCharacterMapperAdapter().toActorRound('game-1', 1, character(), ITEMS);
    expect(round.items.map(each => [each.itemId, each.kind, each.slot, each.baseValue])).toEqual([
      ['sword', 'weapon', 'mainHand', undefined],
      ['shield', 'shield', 'offHand', 20],
      ['mail', 'armor', 'body', 9],
      ['rope', 'other', undefined, undefined],
    ]);
    const sword = round.items[0];
    expect(sword).toMatchObject({ strength: 80, startModifierIds: ['m-1'] });
    // The attack takes the item of its slot (sheets before spec 019), and the damage it brought is in its OB already.
    expect(round.attacks[0]).toMatchObject({ itemId: 'sword', breakagePenalty: 0, currentBo: 60 });
    expect(round.defense.bodyAt).toBe(9);
  });

  it('takes the item of the attack from the sheet, and none without items', () => {
    const sheet = character();
    sheet.attacks[0].itemId = 'shield';
    expect(new ActorRoundCharacterMapperAdapter().toActorRound('game-1', 1, sheet, ITEMS).attacks[0].itemId).toBe('shield');
    const bare = new ActorRoundCharacterMapperAdapter().toActorRound('game-1', 1, character());
    expect(bare.items).toEqual([]);
    expect(bare.attacks[0].itemId).toBeNull();
  });
});

describe('ResolveBreakageCheckHandler', () => {
  const setup = (finished = false) => {
    const round = new ActorRoundCharacterMapperAdapter().toActorRound('game-1', 1, character(), ITEMS);
    const update = vi.fn((_id: string, entity: ActorRound) => Promise.resolve(ActorRound.fromProps(entity.getProps())));
    const actorRoundRepository = { findById: vi.fn(() => Promise.resolve(round)), update } as unknown as ActorRoundRepository;
    const checkNotFinished = vi.fn(() => {
      if (finished) throw new Error('err-game-finished');
    });
    const gameRepository = { findById: vi.fn(() => Promise.resolve({ name: 'Ambush', checkNotFinished })) } as unknown as GameRepository;
    return { handler: new ResolveBreakageCheckHandler(actorRoundRepository, gameRepository), update };
  };

  it('stores the damage with the game as its source and answers the result', async () => {
    const { handler, update } = setup();
    const updated = await handler.execute(
      new ResolveBreakageCheckCommand('ar-1', 'sword', -30, undefined, undefined, undefined, [], 'u', []),
    );
    expect(update).toHaveBeenCalledTimes(1);
    expect(updated.lastBreakageCheck).toMatchObject({
      result: 'failure',
      total: 40,
      modifier: { value: -20, source: { tacticalGameName: 'Ambush' } },
    });
    expect(updated.attacks[0].currentBo).toBe(40);
  });

  it('rejects checks in a finished game', async () => {
    const { handler, update } = setup(true);
    await expect(
      handler.execute(new ResolveBreakageCheckCommand('ar-1', 'sword', 50, undefined, undefined, undefined, [], 'u', [])),
    ).rejects.toThrow('err-game-finished');
    expect(update).not.toHaveBeenCalled();
  });
});
