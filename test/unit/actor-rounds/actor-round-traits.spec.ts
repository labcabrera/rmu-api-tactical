import { describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { DeclareInitiativeDto } from '../../../src/modules/actor-rounds/interfaces/http/dto/declare-initiative.dto.js';
import { ActorRoundDto } from '../../../src/modules/actor-rounds/interfaces/http/dto/actor-round.dto.js';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundEffect } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { ActorRoundTrait } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { ActorRoundCharacterMapperAdapter } from '../../../src/modules/actor-rounds/infrastructure/mappers/actor-round-character-mapper.adapter.js';
import type { Character } from '../../../src/modules/strategic/application/ports/character.port.js';
import { load } from './actor-round-test.factory.js';

const character = (overrides: Partial<Character> = {}): Character =>
  ({
    id: 'character-1',
    gameId: 'sg-1',
    faction: { id: 'faction-1' },
    name: 'Kirax',
    info: { raceName: 'Human', raceId: 'human', sizeId: 'medium' },
    experience: { level: 3 },
    movement: { baseMovementRate: 20, maxPace: 'dash' },
    defense: { defensiveBonus: 10, armor: { at: 1, bodyAt: 1, headAt: 1, armsAt: 1, legsAt: 1 }, shield: null, protect: 0 },
    hp: { max: 50, current: 50 },
    initiative: { totalBonus: 5 },
    skills: [],
    traits: [
      { traitId: 'foiler', traitName: 'Foiler', isTalent: true, tier: 2, cost: 14, specialization: 'blade', source: 'character' },
      { traitId: 'strike-reflex', traitName: 'Strike Reflex', isTalent: true, cost: 5 },
    ],
    items: [],
    equipment: { slots: {}, maneuverPenalty: 0, encumbrancePenalty: 0, movementBaseDifficulty: 'm' },
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
    ...overrides,
  }) as Character;

const nonViolent = (round: number, value = -20) => new ActorRoundEffect(randomUUID(), 'non-violent', value, undefined, round);

const nonViolentPenalty = (round: ActorRound) => round.getPenaltiesBySource().find(p => p.source === 'non-violent')?.value ?? 0;

describe('ActorRoundTrait', () => {
  const traits = [
    new ActorRoundTrait('foiler', 2, 'blade'),
    new ActorRoundTrait('pressing-the-advantage', 1, 'melee-weapon@hafted'),
    new ActorRoundTrait('pressing-the-advantage', 3, 'melee-weapon'),
    new ActorRoundTrait('non-violent', 1, null),
  ];

  it('gives the highest tier of the trait, 0 without it', () => {
    expect(ActorRoundTrait.tierOf(traits, 'pressing-the-advantage')).toBe(3);
    expect(ActorRoundTrait.tierOf(traits, 'non-violent')).toBe(1);
    expect(ActorRoundTrait.tierOf(traits, 'light-boned')).toBe(0);
    expect(ActorRoundTrait.tierOf(undefined, 'light-boned')).toBe(0);
  });

  it('matches a weapon type with the part after @ of the attack skill', () => {
    expect(ActorRoundTrait.tierForSkill(traits, 'foiler', 'melee-weapon@blade')).toBe(2);
    expect(ActorRoundTrait.tierForSkill(traits, 'foiler', 'melee-weapon@hafted')).toBe(0);
    expect(ActorRoundTrait.tierForSkill(traits, 'foiler', null)).toBe(0);
  });

  it('matches a bare skill with all its specializations, and skill@spec only with that one', () => {
    expect(ActorRoundTrait.tierForSkill([traits[1]], 'pressing-the-advantage', 'melee-weapon@hafted')).toBe(1);
    expect(ActorRoundTrait.tierForSkill([traits[1]], 'pressing-the-advantage', 'melee-weapon@blade')).toBe(0);
    expect(ActorRoundTrait.tierForSkill(traits, 'pressing-the-advantage', 'melee-weapon@blade')).toBe(3);
    expect(ActorRoundTrait.tierForSkill(traits, 'pressing-the-advantage', 'ranged-weapon@bow')).toBe(0);
  });

  it('applies a trait without specialization to any attack', () => {
    expect(ActorRoundTrait.tierForSkill(traits, 'non-violent', undefined)).toBe(1);
  });
});

describe('ActorRound traits', () => {
  it('copies the traits (by traitId, tier 1 without tiers) and the attack skill from the character sheet', () => {
    const round = new ActorRoundCharacterMapperAdapter().toActorRound('game-1', 1, character());

    expect(round.traits).toEqual([new ActorRoundTrait('foiler', 2, 'blade'), new ActorRoundTrait('strike-reflex', 1, null)]);
    expect(round.attacks[0].skillId).toBe('melee-weapon@blade');
    expect(ActorRoundDto.fromEntity(round).traits).toEqual([
      { traitId: 'foiler', tier: 2, specialization: 'blade' },
      { traitId: 'strike-reflex', tier: 1, specialization: null },
    ]);
  });

  it('reads older sheets without traits or attack skills', () => {
    const sheet = character({ traits: undefined });
    delete (sheet.attacks[0] as { skillId?: string }).skillId;

    const round = new ActorRoundCharacterMapperAdapter().toActorRound('game-1', 1, sheet);

    expect(round.traits).toEqual([]);
    expect(round.attacks[0].skillId).toBeNull();
  });

  it('keeps the traits in the next rounds', () => {
    const first = new ActorRoundCharacterMapperAdapter().toActorRound('game-1', 1, character());

    const third = ActorRound.createFromPrevious(ActorRound.createFromPrevious(first));

    expect(third.round).toBe(3);
    expect(third.traits).toEqual(first.traits);
    expect(third.getProps().traits).toEqual(first.traits);
  });

  it('copies the resistance roll bonuses of the sheet and keeps them in the next rounds (workspace spec 022)', () => {
    const sheet = character({
      resistances: [
        { resistance: 'fear', totalBonus: 14, statBonus: 4 } as never,
        { resistance: 'physical', totalBonus: 0 },
        { resistance: '', totalBonus: 3 },
      ],
    });
    const first = new ActorRoundCharacterMapperAdapter().toActorRound('game-1', 1, sheet);
    const second = ActorRound.createFromPrevious(first);

    expect(second.resistances).toEqual([
      { resistance: 'fear', totalBonus: 14 },
      { resistance: 'physical', totalBonus: 0 },
    ]);
    expect(second.resistanceBonus('fear')).toBe(14);
    expect(second.resistanceBonus('mentalism')).toBeUndefined();
    expect(ActorRoundDto.fromEntity(second).resistances).toEqual(second.resistances);
    expect(ActorRound.fromProps({ ...second.getProps(), resistances: undefined }).resistances).toEqual([]);
    expect(new ActorRoundCharacterMapperAdapter().toActorRound('game-1', 1, character()).resistances).toEqual([]);
  });

  it('reads actor rounds stored without traits as having none', () => {
    const round = ActorRound.fromProps({ ...load().getProps(), traits: undefined });

    expect(round.traits).toEqual([]);
  });
});

describe('Non-violent', () => {
  it('does not penalize the round the critical was inflicted in', () => {
    const round = load({ round: 2 });

    round.applyAttackResults(0, [nonViolent(2, -40)], undefined, { phase: 2, spentAp: 1 });

    expect(round.effects.map(e => [e.status, e.value])).toEqual([['non-violent', -40]]);
    expect(nonViolentPenalty(round)).toBe(0);
  });

  it('penalizes every action of the following round only', () => {
    const round = load({ round: 2, initiativeBase: 10 });
    round.applyAttackResults(0, [nonViolent(2, -40)], undefined, { phase: 4, spentAp: 3 });
    round.applyUpkeep();

    const next = ActorRound.createFromPrevious(round);
    expect(nonViolentPenalty(next)).toBe(-40);
    next.declareInitiative(10);
    expect(next.initiative.penalty).toBe(-4);

    next.applyUpkeep();
    expect(next.effects).toEqual([]);
    expect(nonViolentPenalty(next)).toBe(0);
    expect(nonViolentPenalty(ActorRound.createFromPrevious(next))).toBe(0);
  });

  it('keeps one penalty per round, the most severe', () => {
    const round = load({ round: 2 });

    round.applyAttackResults(0, [nonViolent(2, -20), nonViolent(2, -40)], undefined, { phase: 1, spentAp: 0 });

    expect(round.effects.map(e => e.value)).toEqual([-40]);
  });
});

describe('Pressing the Advantage effect', () => {
  const pressing = (targetActorId: string, value: number) =>
    new ActorRoundEffect(randomUUID(), 'pressing-advantage', value, undefined, 1, undefined, undefined, targetActorId);

  it('replaces the previous one, against another foe', () => {
    const round = load({ effects: [pressing('orc-1', 10)] });

    round.applyAttackResults(0, [pressing('orc-2', 20)], undefined, { phase: 1, spentAp: 0 });

    expect(round.effects.map(e => [e.status, e.value, e.targetActorId])).toEqual([['pressing-advantage', 20, 'orc-2']]);
  });

  it('is used up by id and does not expire with the rounds', () => {
    const effect = pressing('orc-1', 10);
    const round = load({ effects: [effect] });
    round.applyUpkeep();
    const next = ActorRound.createFromPrevious(round);
    expect(next.effects).toEqual([effect]);

    next.consumeEffects([effect.id]);

    expect(next.effects).toEqual([]);
  });
});

describe('Strike Reflex', () => {
  it('adds +20 to the initiative when declared for an actor with the talent', () => {
    const round = load({ initiativeBase: 10, traits: [new ActorRoundTrait('strike-reflex', 1, null)] });

    round.declareInitiative(12, true);

    expect(round.initiative.total).toBe(42);
    expect(round.initiative.strikeReflex).toBe(20);
  });

  it('adds nothing when not declared', () => {
    const round = load({ initiativeBase: 10, traits: [new ActorRoundTrait('strike-reflex', 1, null)] });

    round.declareInitiative(12);

    expect(round.initiative.total).toBe(22);
    expect(round.initiative.strikeReflex).toBeUndefined();
  });

  it('rejects it for an actor without the talent', () => {
    const round = load({ initiativeBase: 10 });

    expect(() => round.declareInitiative(12, true)).toThrow(expect.objectContaining({ code: 'err-strike-reflex-without-trait' }));
  });

  it('passes the flag from the request to the command, false by default', () => {
    expect(DeclareInitiativeDto.toCommand('ar-1', new DeclareInitiativeDto(12, true), 'user', []).strikeReflex).toBe(true);
    expect(DeclareInitiativeDto.toCommand('ar-1', new DeclareInitiativeDto(12), 'user', []).strikeReflex).toBe(false);
  });
});

describe('ActorRoundCharacterMapperAdapter injuries and conditions (spec 013, §3)', () => {
  const mapper = new ActorRoundCharacterMapperAdapter();
  const source = { kind: 'critical' as const, tacticalGameId: 'other-game' };
  const injury = (id: string, status: 'active' | 'healed', penalty: number) => ({
    id,
    type: 'bone' as const,
    severity: 'medium' as const,
    penalty,
    initialPenalty: penalty,
    source,
    treatments: [],
    status,
    createdAt: '2026-10-01T00:00:00.000Z',
  });

  it('copies the injuries not healed (same uuid) and the unresolved unconsciousness, with a snapshot', () => {
    const round = mapper.toActorRound(
      'game-1',
      1,
      character({
        hp: { max: 50, current: 20 },
        injuries: [injury('broken-leg', 'active', -30), injury('old-cut', 'healed', -5)],
        conditions: [
          { id: 'ko', status: 'unconscious', source, createdAt: '2026-10-01' },
          { id: 'woke', status: 'unconscious', source, createdAt: '2026-10-01', resolvedAt: '2026-10-02' },
        ],
      }),
    );

    expect(round.injuries.map(i => i.id)).toEqual(['broken-leg']);
    expect(round.getPenaltiesBySource()).toContainEqual({ source: 'injury', value: -30 });
    expect(round.effects.map(e => [e.id, e.status])).toEqual([['ko', 'unconscious']]);
    expect(round.characterId).toBe('character-1');
    expect(round.snapshot).toEqual({ hp: 20, injuryIds: ['broken-leg'], conditionIds: ['ko'] });
  });

  it.each(['dead', 'permanent-unconscious'] as const)('rejects a %s character', status => {
    expect(() =>
      mapper.toActorRound('game-1', 1, character({ conditions: [{ id: 'c', status, source, createdAt: '2026-10-01' }] })),
    ).toThrow(expect.objectContaining({ code: 'err-character-not-able' }));
  });
});
