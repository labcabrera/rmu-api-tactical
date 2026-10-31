import { describe, expect, it, vi } from 'vitest';
import { ManeuverBaseModifiersService } from '../../../src/modules/actions/application/services/maneuver/maneuver-base-modifiers.service.js';
import { CreateActorRoundHandler } from '../../../src/modules/actor-rounds/application/cqrs/handlers/create-actor-round.handler.js';
import type { ActorRoundCharacterMapperPort } from '../../../src/modules/actor-rounds/application/ports/actor-round-character-mapper.port.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorSheetService } from '../../../src/modules/actor-rounds/application/services/actor-sheet.service.js';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundDefenseMode } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-defense-mode.vo.js';
import { ActorRoundNpcMapperAdapter } from '../../../src/modules/actor-rounds/infrastructure/mappers/actor-round-npc-mapper.adapter.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import { Actor } from '../../../src/modules/games/domain/value-objects/actor.vo.js';
import type { Npc, NpcPort } from '../../../src/modules/npcs/application/ports/npc.port.js';
import { GroupCheckService } from '../../../src/modules/psychology/application/services/group-check.service.js';
import type { CharacterPort } from '../../../src/modules/strategic/application/ports/character.port.js';
import type { ItemPort } from '../../../src/modules/strategic/application/ports/item.port.js';
import { load } from './actor-round-test.factory.js';
import { CombatShieldPlugin } from '../../../src/modules/actions/application/services/combat/index.js';
import { COMBAT_SKILL_IDS } from '../../../src/modules/actions/application/services/combat/combat-modifiers.js';
import { createCombatPluginContext, rollModifierValues, runPluginHook } from '../actions/combat/combat-plugin-test.factory.js';

/** An invented creature, not of any book: a big beast with a bite, a scimitar and a normal shield (`N20+8/+60`). */
const beast = (overrides: Partial<Npc> = {}): Npc => ({
  id: 'beast',
  realmId: 'realm-1',
  accessType: 'public',
  name: 'Beast',
  category: 'monster',
  level: 6,
  movement: [
    { mode: 'walk-quadruped', baseRate: 40, maxPace: 'sprint' },
    { mode: 'swim', baseRate: 10, maxPace: 'jog' },
  ],
  size: 'big',
  hp: 80,
  deathHits: 100,
  at: 8,
  db: 15,
  shield: { type: 'normal', db: 20, ranks: 8, bonus: 60 },
  initiative: -2,
  attacks: [
    { ob: 70, size: 7, attackTable: 'bite', fumbleTable: null },
    { ob: 55, size: 6, attackTable: 'scimitar', fumbleTable: 'melee-one-hand' },
  ],
  resistances: { channeling: 1, essence: 2, mentalism: 3, physical: 4, fear: 5 },
  skills: [
    { skillId: 'perception', specialization: null, ranks: null, bonus: 35 },
    { skillId: 'influence', specialization: 'intimidation', ranks: 4, bonus: 30 },
  ],
  imageUrl: 'https://example.com/beast.png',
  owner: 'gm',
  ...overrides,
});

const specimen = (npcId: string | null = 'beast') =>
  Actor.fromProps({
    id: 'beast-1',
    npcId: npcId ?? undefined,
    name: 'Beast 1',
    faction: { id: 'environment', name: 'Forest' },
    type: 'npc',
    owner: 'gm',
  });

const mapper = new ActorRoundNpcMapperAdapter();

describe('ActorRoundNpcMapperAdapter (spec 055)', () => {
  it('builds the actor round of a specimen from the stat block', () => {
    const round = mapper.toActorRound('game-1', 1, specimen(), beast());
    expect(round).toMatchObject({
      gameId: 'game-1',
      round: 1,
      actorType: 'npc',
      actorId: 'beast-1',
      actorName: 'Beast 1',
      npcId: 'beast',
      // Big is one size over medium.
      size: 1,
      raceName: 'monster',
      level: 6,
      factionId: 'environment',
      owner: 'gm',
      imageUrl: 'https://example.com/beast.png',
      initiative: { base: -2, penalty: 0 },
      movement: { bmr: 40, penalty: 0, maxPace: 'sprint', baseDifficulty: 'c' },
      hp: { max: 80, current: 80, deathThreshold: 19 },
      defense: {
        bd: 15,
        at: 8,
        headAt: 8,
        bodyAt: 8,
        armsAt: 8,
        legsAt: 8,
        shield: { db: 20, blockCount: 2, currentBlocks: 0 },
        protect: 0,
      },
    });
    expect(round.characterId).toBeUndefined();
    expect(round.snapshot).toBeUndefined();
    expect(
      round.attacks.map(a => [a.attackName, a.baseBo, a.currentBo, a.attackTable, a.fumbleTable, a.attackSize, a.fumble, a.weaponCategory]),
    ).toEqual([
      ['bite-1', 70, 70, 'bite', 'animals', 2, 1, 'natural'],
      ['scimitar-2', 55, 55, 'scimitar', 'melee-one-hand', 1, 1, 'standard'],
    ]);
    expect(round.resistances).toEqual([
      { resistance: 'physical', totalBonus: 4 },
      { resistance: 'fear', totalBonus: 5 },
      { resistance: 'channeling', totalBonus: 1 },
      { resistance: 'essence', totalBonus: 2 },
      { resistance: 'mentalism', totalBonus: 3 },
    ]);
  });

  it('dies when the damage reaches the death hits, not before', () => {
    const round = mapper.toActorRound('game-1', 1, specimen(), beast());
    round.adjustHp(99);
    expect(round.isDead()).toBe(false);
    round.adjustHp(1);
    expect(round.isDead()).toBe(true);
  });

  it('falls back to the hits without death hits, and to no movement, shield nor resistances', () => {
    const round = mapper.toActorRound(
      'game-1',
      1,
      specimen(),
      beast({ deathHits: null, movement: [], shield: null, resistances: null, attacks: [] }),
    );
    expect(round.hp.deathThreshold).toBeUndefined();
    expect(round.movement).toMatchObject({ bmr: 0, maxPace: 'walk' });
    expect(round.defense.shield).toBeNull();
    expect(round.resistances).toEqual([]);
    expect(round.attacks).toEqual([]);
  });

  it('gives the shield the DB and the blocks of its type (Table 9-6, ADR 0010)', () => {
    const shieldOf = (shield: Npc['shield']) => mapper.toActorRound('g', 1, specimen(), beast({ shield })).defense.shield;
    expect(shieldOf({ type: 'normal', db: 20, ranks: 8, bonus: 60 })).toEqual({ db: 20, blockCount: 2, currentBlocks: 0 });
    // Stored before spec 056: the DB of the type.
    expect(shieldOf({ type: 'target', ranks: 0, bonus: 0 })).toMatchObject({ db: 15, blockCount: 1 });
    expect(shieldOf({ type: 'full', db: null, ranks: 0, bonus: 0 })).toMatchObject({ db: 25, blockCount: 3 });
    expect(shieldOf({ type: 'wall', db: 35, ranks: 0, bonus: 0 })).toMatchObject({ db: 35, blockCount: 4 });
    // Not the Shield skill bonus, the bug of spec 055.
    expect(shieldOf({ type: 'normal', ranks: 8, bonus: 60 })).toMatchObject({ db: 20 });
    expect(shieldOf({ type: 'made-up', ranks: 0, bonus: 0 })).toMatchObject({ db: 0, blockCount: 1 });
  });

  it('rejects a size it does not know', () => {
    expect(() => mapper.toActorRound('game-1', 1, specimen(), beast({ size: 'colossal' }))).toThrow('not supported');
  });

  it('keeps the NPC in the next rounds', () => {
    const next = ActorRound.createFromPrevious(mapper.toActorRound('game-1', 1, specimen(), beast()));
    expect(next).toMatchObject({ round: 2, actorType: 'npc', npcId: 'beast' });
    expect(ActorRound.fromProps(next.getProps()).npcId).toBe('beast');
  });
});

describe('CreateActorRoundHandler for NPCs (spec 055)', () => {
  const handler = (npc: Npc | undefined) =>
    new CreateActorRoundHandler(
      { findByActorIdAndRound: vi.fn(() => Promise.resolve(null)) } as unknown as ActorRoundRepository,
      {} as CharacterPort,
      {} as ActorRoundCharacterMapperPort,
      {} as ItemPort,
      { findById: vi.fn(() => Promise.resolve(npc)) },
      mapper,
    );

  it('builds round 1 of a specimen from its NPC', async () => {
    const round = await handler(beast()).buildActorRound('game-1', specimen(), 1);
    expect(round).toMatchObject({ actorType: 'npc', npcId: 'beast', actorId: 'beast-1' });
  });

  it('rejects a specimen without NPC and an NPC the npcs API does not find', async () => {
    await expect(handler(beast()).buildFromTemplate('game-1', specimen(null), 1)).rejects.toThrow('without npcId');
    await expect(handler(undefined).buildFromTemplate('game-1', specimen(), 1)).rejects.toMatchObject({ code: 'err-npc-not-found' });
  });
});

describe('ActorSheetService (spec 055)', () => {
  const characters = { findById: vi.fn((id: string) => Promise.resolve({ id, skills: [] })) } as unknown as CharacterPort;
  const npcs = { findById: vi.fn((id: string) => Promise.resolve(id === 'beast' ? beast() : undefined)) } as NpcPort;
  const sheets = new ActorSheetService(characters, npcs);

  it('reads the stat block of an NPC and never strategic for it', async () => {
    const sheet = await sheets.find({ actorType: 'npc', actorId: 'beast-1', characterId: undefined, npcId: 'beast' });
    expect(sheet).toEqual({
      npc: true,
      skills: [
        { skillId: 'perception', specialization: null, totalBonus: 35 },
        { skillId: 'influence', specialization: 'intimidation', totalBonus: 30, ranks: 4 },
        { skillId: 'shield', specialization: null, totalBonus: 60, ranks: 8 },
      ],
      equipment: { maneuverPenalty: 0, encumbrancePenalty: 0 },
    });
    expect(await sheets.find({ actorType: 'npc', actorId: 'x', characterId: undefined, npcId: undefined })).toBeUndefined();
    expect(await sheets.find({ actorType: 'npc', actorId: 'x', characterId: undefined, npcId: 'gone' })).toBeUndefined();
    expect(characters.findById).not.toHaveBeenCalled();
  });

  it('reads the character sheet of a character', async () => {
    expect(await sheets.find({ actorType: 'character', actorId: 'aragorn', characterId: undefined, npcId: undefined })).toEqual({
      id: 'aragorn',
      skills: [],
    });
  });

  it('gives the Shield skill of the shield only to an NPC with one, and keeps a Shield skill the block lists', () => {
    expect(ActorSheetService.fromNpc(beast({ shield: null })).skills.map(skill => skill.skillId)).toEqual(['perception', 'influence']);
    const listed = ActorSheetService.fromNpc(beast({ skills: [{ skillId: 'shield', specialization: null, ranks: 3, bonus: 40 }] })).skills;
    expect(listed).toEqual([{ skillId: 'shield', specialization: null, totalBonus: 40, ranks: 3 }]);
    expect(ActorSheetService.fromNpc(beast({ shield: { type: 'target', ranks: null, bonus: null }, skills: [] })).skills).toEqual([
      { skillId: 'shield', specialization: null, totalBonus: 0 },
    ]);
  });

  it('blocks with the shield DB and the Shield skill of the stat block (§9.6, ADR 0010)', async () => {
    const npc = beast();
    const round = mapper.toActorRound('g', 1, specimen(), npc);
    const targetSkills = ActorSheetService.fromNpc(npc)
      .skills.filter(skill => COMBAT_SKILL_IDS.includes(skill.skillId))
      .map(skill => ({ skillId: skill.skillId, bonus: skill.totalBonus, ranks: skill.ranks ?? 0 }));
    const block = async (mode: 'passive' | 'full') => {
      const ctx = createCombatPluginContext({
        shield: round.defense.shield,
        defenseMode: ActorRoundDefenseMode.of('none', mode),
        targetSkills,
      });
      await runPluginHook(CombatShieldPlugin, 'prepare', ctx);
      return rollModifierValues(ctx);
    };

    expect(await block('passive')).toEqual({ shield: -20, 'shield-block': -8 });
    expect(await block('full')).toEqual({ shield: -20, 'shield-block': -60 });
  });

  it('counts a skill the stat block does not list as 0, not unskilled', () => {
    const sheet = ActorSheetService.fromNpc(beast());
    expect(ManeuverBaseModifiersService.skillBonus(sheet, 'perception', null)).toMatchObject({ bonus: 35, unskilled: false });
    expect(ManeuverBaseModifiersService.skillBonus(sheet, 'climbing', null)).toMatchObject({ bonus: 0, ranks: 0, unskilled: false });
    expect(ManeuverBaseModifiersService.skillBonus({ skills: [] }, 'climbing', null)).toMatchObject({ bonus: -25, unskilled: true });
  });

  it('takes the Intimidation ranks of an NPC from its stat block, and asks for them when it does not give them', async () => {
    const npcRound = (npcId: string) =>
      Object.assign(load(), { actorId: 'beast-1', actorName: 'Beast 1', actorType: 'npc' as const, npcId });
    const service = new GroupCheckService({} as GameRepository, {} as ActorRoundRepository, sheets);
    expect(await service.intimidationRanks([npcRound('beast')], 'beast-1', undefined)).toBe(4);
    const mute = new GroupCheckService(
      {} as GameRepository,
      {} as ActorRoundRepository,
      new ActorSheetService(characters, { findById: () => Promise.resolve(beast({ skills: [] })) }),
    );
    await expect(mute.intimidationRanks([npcRound('beast')], 'beast-1', undefined)).rejects.toMatchObject({
      code: 'err-intimidation-ranks-required',
    });
  });
});
