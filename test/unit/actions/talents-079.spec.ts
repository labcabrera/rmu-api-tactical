import { describe, expect, it, vi } from 'vitest';
import type { CriticalTableLookupRequest, CriticalTablePort } from '../../../src/modules/actions/application/ports/critical-table.port.js';
import { ManeuverBaseModifiersService } from '../../../src/modules/actions/application/services/maneuver/maneuver-base-modifiers.service.js';
import { CombatDodgePlugin } from '../../../src/modules/actions/application/services/combat/plugins/combat-dodge.plugin.js';
import { CombatRangePlugin } from '../../../src/modules/actions/application/services/combat/plugins/combat-range.plugin.js';
import {
  CombatElementalDefensePlugin,
  CombatExtraJointsPlugin,
} from '../../../src/modules/actions/application/services/combat/plugins/combat-talents-079.plugin.js';
import {
  situationalTraitModifiers,
  situationalTraitOptions,
  targetOdorModifiers,
} from '../../../src/modules/actions/domain/services/situational-trait-bonuses.js';
import { elementalRrModifier, spellElement } from '../../../src/modules/actions/domain/services/spell-talents.js';
import { pacePenaltyFor } from '../../../src/modules/actions/domain/services/uncoordinated-pace.js';
import { CriticalResult } from '../../../src/modules/actions/domain/value-objects/critical-result.vo.js';
import type { ActionSpellInfo } from '../../../src/modules/actions/domain/value-objects/action-spell.vo.js';
import { elementalEnvironmentModifier } from '../../../src/modules/actor-rounds/application/cqrs/handlers/resolve-endurance-check.handler.js';
import type { HazardRequest } from '../../../src/modules/actor-rounds/application/cqrs/commands/resolve-hazard.command.js';
import { CauterizationBurnService } from '../../../src/modules/actor-rounds/application/services/cauterization-burn.service.js';
import { HazardAttackService } from '../../../src/modules/actor-rounds/application/services/hazard-attack.service.js';
import {
  elementalModifier,
  elementalSeveritySteps,
  elementOf,
  elementOfAttackTable,
  elementOfCritical,
} from '../../../src/modules/actor-rounds/domain/services/elemental-talents.js';
import { breathHoldingRounds, breathLimitRounds } from '../../../src/modules/actor-rounds/domain/services/environment-rules.js';
import { ActorRoundDefenseMode } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-defense-mode.vo.js';
import { ActorRoundMovement } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-movement.vo.js';
import { ActorRoundTrait } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import type { Injury } from '../../../src/modules/actor-rounds/domain/value-objects/injury.vo.js';
import { ActorRoundCharacterMapperAdapter } from '../../../src/modules/actor-rounds/infrastructure/mappers/actor-round-character-mapper.adapter.js';
import type { Character } from '../../../src/modules/strategic/application/ports/character.port.js';
import { load } from '../actor-rounds/actor-round-test.factory.js';
import { createCombatPluginContext, rollModifierValues, runPluginHook } from './combat/combat-plugin-test.factory.js';
import { profile } from './maneuver/maneuver-test.factory.js';

// Workspace spec 079, phase 7 (block D, talents): invented numbers and names, no book text.

const trait = (traitId: string, tier = 1, specialization: string | null = null) => new ActorRoundTrait(traitId, tier, specialization);

const prepare = async (plugin: Parameters<typeof runPluginHook>[0], ctx: ReturnType<typeof createCombatPluginContext>) => {
  const applied = await runPluginHook(plugin, 'prepare', ctx);
  return { applied, modifiers: rollModifierValues(ctx) };
};

describe('D1: Uncoordinated beyond run', () => {
  it('reads the penalty of the pace it counts as, -25 per pace beyond run', () => {
    expect(pacePenaltyFor('walk')).toBe(-25);
    expect(pacePenaltyFor('walk', 1)).toBe(-50);
    expect(pacePenaltyFor('run', 1)).toBe(-100);
    expect(pacePenaltyFor('jog', 2)).toBe(-100);
    expect(pacePenaltyFor('run', 2)).toBe(-125);
    expect(pacePenaltyFor('creep')).toBe(0);
  });

  const service = new ManeuverBaseModifiersService();
  const compute = (pace: 'walk' | 'run' | 'sprint', tier: number) =>
    service.compute({
      actorRound: load({ traits: tier ? [trait('uncoordinated', tier)] : [] }),
      character: { skills: [], equipment: { maneuverPenalty: 0, encumbrancePenalty: 0 } },
      profile: profile(),
      skillId: 'wall-scaling',
      actionPoints: null,
      pace,
      includePace: true,
    });

  it('gives the maneuvers the effective pace as an uncoordinated line', () => {
    const base = compute('run', 1).base;
    expect(base.find(m => m.key === 'pace')?.value).toBe(-75);
    expect(base.find(m => m.key === 'uncoordinated')).toMatchObject({
      value: -25,
      params: { pace: 'run', effectivePace: 'sprint', tier: 1 },
    });
    expect(compute('walk', 0).base.find(m => m.key === 'uncoordinated')).toBeUndefined();
  });

  it('still refuses a maneuver while sprinting', () => {
    expect(() => compute('sprint', 1)).toThrow();
  });
});

describe('D1: Deadeye in the range breakdown', () => {
  it('splits the range bonus of the sheet into the table penalty and Deadeye, adding up to the same', async () => {
    const ctx = createCombatPluginContext({
      attackType: 'ranged',
      range: 40,
      skillId: 'ranged-weapon@bow',
      sourceTraits: [trait('deadeye', 2, 'bow')],
      ranges: [
        { from: 0, to: 30, bonus: 0, traitBonus: 10 },
        { from: 30, to: 60, bonus: -5, traitBonus: 20 },
      ],
    });
    const { modifiers } = await prepare(CombatRangePlugin, ctx);
    expect(modifiers).toEqual({ 'range-penalty': -25, deadeye: 20 });
    expect(ctx.attackPreparation!.modifiers.rollModifiers.find(m => m.key === 'deadeye')?.params).toEqual({ tier: 2 });
  });

  it('keeps a single line for a sheet without the share', async () => {
    const ctx = createCombatPluginContext({ attackType: 'ranged', range: 40, ranges: [{ from: 0, to: 60, bonus: -10 }] });
    expect((await prepare(CombatRangePlugin, ctx)).modifiers).toEqual({ 'range-penalty': -10 });
  });
});

describe('D2: the dodge keeps the whole load penalty (Beast of Burden)', () => {
  it('reads dodgePenalty, and penalty when the round has none', async () => {
    const ctx = createCombatPluginContext({
      defenseMode: ActorRoundDefenseMode.of('full', 'none'),
      targetSkills: [{ skillId: 'running', bonus: 40, ranks: 8 }],
    });
    (ctx.targetActor as { movement: ActorRoundMovement }).movement = new ActorRoundMovement(20, -5, 'run', 'm', -15);
    expect((await prepare(CombatDodgePlugin, ctx)).modifiers).toEqual({ dodge: -25 });
    expect(ActorRoundMovement.dodgePenaltyOf({ penalty: -7 })).toBe(-7);
  });

  it('adds Vigorous and Feeble of the sheet to the endurance of the round', () => {
    const character = {
      skills: [{ skillId: 'body-development', totalBonus: 30 }],
      endurance: { racialBonus: 5, traitBonus: 20, fatiguePenalty: 0 },
    } as unknown as Character;
    expect(ActorRoundCharacterMapperAdapter.mapFatigue(character).endurance).toBe(55);
    expect(ActorRoundTrait.enduranceBonusOf([trait('vigorous', 2), trait('feeble', 1)])).toBe(10);
  });
});

describe('D3: situational talents', () => {
  const traits = [
    trait('golden-throat', 2),
    trait('empathy'),
    trait('animal-empathy', 1, 'horses'),
    trait('extra-joints'),
    trait('light-sleeper'),
    trait('wings-vestigial'),
  ];

  it('lists the ones of the actor that can help the skill', () => {
    expect(situationalTraitOptions(traits, { skillId: 'influence' }).map(o => [o.traitId, o.value])).toEqual([
      ['golden-throat', 20],
      ['extra-joints', 20],
    ]);
    expect(situationalTraitOptions(traits, { skillId: 'riding' }).find(o => o.traitId === 'animal-empathy')).toMatchObject({
      value: 25,
      specialization: 'horses',
    });
    expect(situationalTraitOptions(traits, { skillId: 'social-awareness' }).map(o => o.traitId)).toContain('empathy');
    expect(situationalTraitOptions(traits, { skillId: 'perception' }).map(o => o.traitId)).toContain('light-sleeper');
  });

  it('limits Golden Throat on Music to singing and does not stack it with Perfect Pitch or Musical', () => {
    expect(situationalTraitOptions(traits, { skillId: 'music', specialization: 'flute' }).map(o => o.traitId)).not.toContain(
      'golden-throat',
    );
    const withPitch = [...traits, trait('perfect-pitch', 1)];
    expect(situationalTraitOptions(withPitch, { skillId: 'music', specialization: 'singing' })[0]).toMatchObject({
      traitId: 'golden-throat',
      value: 10,
      replaces: 10,
    });
    const higher = [trait('golden-throat', 1), trait('musical', 3)];
    const [line] = situationalTraitModifiers(higher, { skillId: 'music', specialization: 'singing' }, ['golden-throat']);
    expect(line).toMatchObject({ key: 'situational-golden-throat', value: 0, params: { replaces: 30 } });
  });

  it('adds a line per ticked talent and refuses one that does not apply', () => {
    const lines = situationalTraitModifiers(traits, { skillId: 'influence' }, ['golden-throat']);
    expect(lines.map(line => [line.key, line.value, line.group, line.rule])).toEqual([
      ['situational-golden-throat', 20, 'talent', 'Core Law ch. 4'],
    ]);
    expect(() => situationalTraitModifiers(traits, { skillId: 'influence' }, ['empathy'])).toThrow(
      expect.objectContaining({ code: 'err-maneuver-situational-trait' }) as Error,
    );
    expect(() => situationalTraitModifiers([], { skillId: 'influence' }, ['golden-throat'])).toThrow();
    expect(situationalTraitModifiers([trait('heavy-sleeper')], { skillId: 'perception' }, ['heavy-sleeper'])[0].value).toBe(-25);
  });

  it('gives Wings, Vestigial on its own to a fall control', () => {
    expect(situationalTraitModifiers(traits, { skillId: 'acrobatics', purpose: 'fall-control' }).map(l => [l.key, l.value])).toEqual([
      ['situational-wings-vestigial', 10],
    ]);
    expect(situationalTraitModifiers(traits, { skillId: 'acrobatics' })).toEqual([]);
  });

  it('reads the odour of the target only by smell', () => {
    expect(targetOdorModifiers([trait('neutral-odor')], 'tracking', 'smell', 'Fox').map(l => [l.key, l.value])).toEqual([
      ['target-neutral-odor', -50],
    ]);
    expect(targetOdorModifiers([trait('distinct-odor')], 'perception', 'smell')[0].value).toBe(50);
    expect(targetOdorModifiers([trait('distinct-odor')], 'perception', 'vision')).toEqual([]);
    expect(targetOdorModifiers([trait('distinct-odor')], 'influence', 'smell')).toEqual([]);
  });

  it('gives +20 to an attack with the flexible limb of Extra Joints', async () => {
    const ctx = createCombatPluginContext({ sourceTraits: [trait('extra-joints')], modifiers: { extraJoints: true } });
    expect((await prepare(CombatExtraJointsPlugin, ctx)).modifiers).toEqual({ 'extra-joints': 20 });
    const without = createCombatPluginContext({ sourceTraits: [], modifiers: { extraJoints: true } });
    expect((await prepare(CombatExtraJointsPlugin, without)).applied).toBe(false);
  });
});

describe('D4: Elemental Resistance and Susceptibility', () => {
  it('reads the element of the specialization, Creature Law names included', () => {
    expect(['Fire', 'heat', 'Cold/Ice', 'ice', 'Lightning', 'electricity', 'Water', 'Earth', 'Wind'].map(elementOf)).toEqual([
      'heat',
      'heat',
      'cold',
      'cold',
      'electricity',
      'electricity',
      'water',
      'earth',
      'air',
    ]);
    expect(elementOf('poison')).toBeNull();
  });

  it('maps the critical types and the elemental attack tables', () => {
    expect(['H', 'steam', 'O', 'L', 'S'].map(elementOfCritical)).toEqual(['heat', 'heat', 'cold', 'electricity', null]);
    expect(['fire-bolt', 'ice-bolt', 'cold-ball', 'lightning-ball', 'water-bolt'].map(elementOfAttackTable)).toEqual([
      'heat',
      'cold',
      'cold',
      'electricity',
      null,
    ]);
  });

  it('gives +5/-5 per tier and one severity per 2 tiers', () => {
    const resistant = [trait('elemental-resistance', 3, 'fire')];
    expect(elementalModifier(resistant, 'heat')).toBe(15);
    expect(elementalModifier(resistant, 'cold')).toBe(0);
    expect(elementalSeveritySteps(resistant, 'heat')).toBe(-1);
    const weak = [trait('elemental-susceptibility', 4, 'ice')];
    expect(elementalModifier(weak, 'cold')).toBe(-20);
    expect(elementalSeveritySteps(weak, 'cold')).toBe(2);
  });

  it('adds the DB of the target against an attack of its element', async () => {
    const ctx = createCombatPluginContext({ targetTraits: [trait('elemental-resistance', 2, 'heat')] });
    (ctx.sourceAttack as { attackTable: string }).attackTable = 'fire-bolt';
    expect((await prepare(CombatElementalDefensePlugin, ctx)).modifiers).toEqual({ 'elemental-talent': -10 });
    const other = createCombatPluginContext({ targetTraits: [trait('elemental-resistance', 2, 'heat')] });
    expect((await prepare(CombatElementalDefensePlugin, other)).applied).toBe(false);
    const weak = createCombatPluginContext({ targetTraits: [trait('elemental-susceptibility', 1, 'lightning')] });
    (weak.sourceAttack as { attackTable: string }).attackTable = 'lightning-bolt';
    expect((await prepare(CombatElementalDefensePlugin, weak)).modifiers).toEqual({ 'elemental-talent': 5 });
  });

  it('adds the RR modifier against a spell of the element', () => {
    const spell = { effects: [{ kind: 'attack', attackTable: 'ice-bolt', criticalType: 'O' }] } as unknown as ActionSpellInfo;
    expect(spellElement(spell)).toBe('cold');
    expect(elementalRrModifier([trait('elemental-resistance', 2, 'cold')], spell)).toMatchObject({
      key: 'elemental-talent',
      value: 10,
      group: 'talent',
      params: { element: 'cold', resistance: 2 },
    });
    expect(elementalRrModifier([trait('elemental-resistance', 2, 'heat')], spell)).toBeUndefined();
    expect(spellElement({ effects: [] })).toBeNull();
  });

  it('adds the Endurance modifier in a game with an extreme temperature of its element', () => {
    const actor = load({ traits: [trait('elemental-resistance', 2, 'heat')] });
    const game = (kind: 'cold' | 'heat' | 'steam') =>
      ({ environment: { extremeTemperature: { kind, temperature: null, severity: 'A' } } }) as never;
    expect(elementalEnvironmentModifier(actor, game('steam'))).toBe(10);
    expect(elementalEnvironmentModifier(actor, game('cold'))).toBe(0);
    expect(elementalEnvironmentModifier(actor, null)).toBe(0);
  });

  const criticalTable = (): { port: CriticalTablePort; lookups: CriticalTableLookupRequest[] } => {
    const lookups: CriticalTableLookupRequest[] = [];
    return {
      lookups,
      port: {
        lookup: vi.fn((request: CriticalTableLookupRequest) => {
          lookups.push(request);
          return Promise.resolve(new CriticalResult('Burnt.', 3, 'chest', []));
        }),
      },
    };
  };

  it('moves the fixed critical of an extreme temperature', async () => {
    const { port } = criticalTable();
    const service = new HazardAttackService({ lookup: vi.fn() }, port);
    const request = {
      kind: 'extreme-temperature',
      temperatureKind: 'heat',
      temperature: null,
      severity: 'C',
      criticalRolls: [],
    } as unknown as HazardRequest;
    const context = { gameId: 'game-1', round: 1, phase: 1 };
    const resistant = await service.resolve(load({ traits: [trait('elemental-resistance', 2, 'fire')] }), request, 0, context);
    expect(resistant).toMatchObject({ originalSeverity: 'C', severity: 'B', severitySteps: [{ key: 'elemental-talent', value: -1 }] });
    const weak = await service.resolve(load({ traits: [trait('elemental-susceptibility', 4, 'heat')] }), request, 0, context);
    expect(weak.severity).toBe('E');
    const mild = await service.resolve(
      load({ traits: [trait('elemental-resistance', 2, 'heat')] }),
      { ...request, severity: 'A' },
      0,
      context,
    );
    expect(mild.severity).toBeNull();
    expect(mild.criticals).toEqual([]);
  });

  it('moves the critical of the upkeep of an extreme temperature', () => {
    const actor = load({ traits: [trait('elemental-resistance', 4, 'cold')] });
    const alerts = actor.addEnvironmentCriticalAlerts({
      kind: 'cold',
      temperature: -110,
      criticalType: 'O',
      severity: 'C',
      severitySource: 'table',
    });
    expect(alerts.map(alert => alert.getModifierText('criticalSeverity'))).toEqual(['A']);
    const gone = load({ traits: [trait('elemental-resistance', 2, 'cold')] });
    expect(
      gone.addEnvironmentCriticalAlerts({ kind: 'cold', temperature: -60, criticalType: 'O', severity: 'A', severitySource: 'table' }),
    ).toEqual([]);
  });

  it('moves the heat critical of a cauterization', async () => {
    const { port, lookups } = criticalTable();
    const service = new CauterizationBurnService(port);
    const patient = load({ traits: [trait('elemental-resistance', 2, 'heat')] });
    const injury = { id: 'injury-1', location: 'arm', side: 'left' } as unknown as Injury;
    const heat = await service.burn(patient, injury, { heatCritical: 'B', heatHitsDice: 0 } as never, { heatCriticalRoll: 50 }, {
      kind: 'treatment',
    } as never);
    expect(heat).toMatchObject({ critical: 'A', originalCritical: 'B' });
    expect(lookups[0]).toMatchObject({ criticalType: 'H', criticalSeverity: 'A' });
    const none = await service.burn(patient, injury, { heatCritical: 'A', heatHitsDice: 0 } as never, {}, { kind: 'treatment' } as never);
    expect(none).toMatchObject({ critical: 'none' });
    expect(none?.alertId).toBeUndefined();
  });
});

describe('D5: Breath Holding', () => {
  it('holds 12 rounds per level, twice inactive and three times with Meditation', () => {
    expect(breathHoldingRounds({ level: 3 })).toBe(36);
    expect(breathHoldingRounds({ level: 3, inactive: true })).toBe(72);
    expect(breathHoldingRounds({ level: 3, inactive: true, meditation: true })).toBe(108);
    expect(breathHoldingRounds({ level: 0 })).toBe(12);
  });

  it('never shortens the limit of §15.2', () => {
    expect(breathLimitRounds({ prepared: true, constitutionBonus: 5, talentRounds: 36 })).toBe(36);
    expect(breathLimitRounds({ prepared: true, constitutionBonus: 20, talentRounds: 12 })).toBe(32);
  });
});
