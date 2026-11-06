import { describe, expect, it, vi } from 'vitest';
import type { CriticalTableLookupRequest, CriticalTablePort } from '../../../src/modules/actions/application/ports/critical-table.port.js';
import type { AttackTablePort } from '../../../src/modules/actions/application/ports/attack-table.port.js';
import { CriticalResult } from '../../../src/modules/actions/domain/value-objects/critical-result.vo.js';
import { FOG_TABLE, fogModifiers } from '../../../src/modules/actions/domain/value-objects/fog-level.vo.js';
import { StartBreathCommand } from '../../../src/modules/actor-rounds/application/cqrs/commands/environment.commands.js';
import type { HazardRequest } from '../../../src/modules/actor-rounds/application/cqrs/commands/resolve-hazard.command.js';
import { StartBreathHandler } from '../../../src/modules/actor-rounds/application/cqrs/handlers/environment.handlers.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { HazardAttackService } from '../../../src/modules/actor-rounds/application/services/hazard-attack.service.js';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import {
  breathCheckDifficulty,
  breathLimitRounds,
  resolveExtremeTemperature,
  type ResolvedExtremeTemperature,
  suffocationHits,
  temperatureSeverity,
} from '../../../src/modules/actor-rounds/domain/services/environment-rules.js';
import {
  ActorRoundEffect,
  ADRENAL_FOCUS,
  SUFFOCATING,
} from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import { GameEnvironment } from '../../../src/modules/games/domain/value-objects/game-environment.vo.js';
import type { Character, CharacterPort } from '../../../src/modules/strategic/application/ports/character.port.js';
import { sheetsOf } from '../support/actor-sheets.js';
import { effect, load, stunPenalty } from './actor-round-test.factory.js';

// Workspace spec 079, C3-C5: only the numbers of §15.2, §15.3 (Table 15-3) and §15.7 (Table 15-7).

const pending = (round: ActorRound, type: string) => round.alerts.filter(alert => alert.type === type && alert.status === 'pending');
const modifier = (round: ActorRound, type: string, key: string) => pending(round, type)[0]?.modifiers?.find(each => each.key === key);

const COLD_B: ResolvedExtremeTemperature = { kind: 'cold', temperature: -80, criticalType: 'O', severity: 'B', severitySource: 'table' };

/** Holds its breath in `round` with a limit of `limit` rounds, then runs the upkeeps up to `upTo` (same actor round). */
const holding = (limit: number, options: { underwater?: boolean } = {}) => {
  const round = load({ round: 1, hp: [60, 60] });
  round.startBreath({
    prepared: true,
    underwater: options.underwater ?? false,
    constitutionBonus: limit - 12,
    constitutionSource: 'sheet',
    limitRounds: limit,
    note: null,
  });
  return round;
};

/** The next round, as the start of a round builds it. */
const next = (round: ActorRound) => ActorRound.createFromPrevious(round);

describe('Table 15-3: extreme temperatures (spec 079, C3)', () => {
  it('cold from -50 °C down to I below -250', () => {
    expect(temperatureSeverity(-49)).toBeNull();
    expect(temperatureSeverity(-50)).toEqual({ kind: 'cold', severity: 'A' });
    expect(temperatureSeverity(-75)).toEqual({ kind: 'cold', severity: 'A' });
    expect(temperatureSeverity(-76)).toEqual({ kind: 'cold', severity: 'B' });
    expect(temperatureSeverity(-101)).toEqual({ kind: 'cold', severity: 'C' });
    expect(temperatureSeverity(-176)).toEqual({ kind: 'cold', severity: 'F' });
    expect(temperatureSeverity(-225)).toEqual({ kind: 'cold', severity: 'G' });
    expect(temperatureSeverity(-250)).toEqual({ kind: 'cold', severity: 'H' });
    expect(temperatureSeverity(-251)).toEqual({ kind: 'cold', severity: 'I' });
  });

  it('heat from 101 °C, E up to 800 and one severity more for each 300 above', () => {
    expect(temperatureSeverity(100)).toBeNull();
    expect(temperatureSeverity(101)).toEqual({ kind: 'heat', severity: 'A' });
    expect(temperatureSeverity(151)).toEqual({ kind: 'heat', severity: 'B' });
    expect(temperatureSeverity(400)).toEqual({ kind: 'heat', severity: 'C' });
    expect(temperatureSeverity(401)).toEqual({ kind: 'heat', severity: 'D' });
    expect(temperatureSeverity(800)).toEqual({ kind: 'heat', severity: 'E' });
    expect(temperatureSeverity(801)).toEqual({ kind: 'heat', severity: 'F' });
    expect(temperatureSeverity(1101)).toEqual({ kind: 'heat', severity: 'G' });
    expect(temperatureSeverity(10000)).toEqual({ kind: 'heat', severity: 'J' });
  });

  it('resolves the critical: cold O, heat H, steam its own table on the heat side, or the severity given', () => {
    expect(resolveExtremeTemperature({ temperature: -80 })).toMatchObject({ kind: 'cold', criticalType: 'O', severity: 'B' });
    expect(resolveExtremeTemperature({ kind: 'steam', temperature: 160 })).toMatchObject({ criticalType: 'steam', severity: 'B' });
    expect(resolveExtremeTemperature({ kind: 'heat', severity: 'c' })).toMatchObject({
      criticalType: 'H',
      severity: 'C',
      severitySource: 'given',
    });
    expect(() => resolveExtremeTemperature({ kind: 'cold', temperature: 200 })).toThrow(
      expect.objectContaining({ code: 'err-temperature-not-extreme' }),
    );
    expect(() => resolveExtremeTemperature({ temperature: 20 })).toThrow(expect.objectContaining({ code: 'err-temperature-not-extreme' }));
    expect(() => resolveExtremeTemperature({ kind: 'heat', severity: 'Q' })).toThrow();
  });
});

describe('Extreme temperature of the environment (spec 079, C3)', () => {
  it('each upkeep asks for the critical of every actor not protected, once per round', () => {
    const round = load({ round: 3 });
    round.applyUpkeep({ extremeTemperature: COLD_B });
    round.applyUpkeep({ extremeTemperature: COLD_B });
    const alerts = pending(round, 'critical');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].getModifierText('origin')).toBe('environment');
    expect(alerts[0].getModifierText('criticalType')).toBe('O');
    expect(alerts[0].getModifierText('criticalSeverity')).toBe('B');
  });

  it('a severity above E asks for several criticals; protected or dead actors take none', () => {
    const round = load();
    round.addEnvironmentCriticalAlerts({ ...COLD_B, severity: 'G' });
    expect(pending(round, 'critical').map(alert => alert.getModifierText('criticalSeverity'))).toEqual(['E', 'B']);
    const sheltered = load();
    sheltered.setEnvironmentProtection(true);
    sheltered.applyUpkeep({ extremeTemperature: COLD_B });
    expect(pending(sheltered, 'critical')).toHaveLength(0);
    const dead = load({ effects: [effect('dead')] });
    expect(dead.addEnvironmentCriticalAlerts(COLD_B)).toEqual([]);
  });

  it('the protection and the held breath go on to the next round', () => {
    const round = holding(5);
    round.setEnvironmentProtection(true);
    const following = next(round);
    expect(following.protectedFromEnvironment).toBe(true);
    expect(following.breath).toMatchObject({ sinceRound: 1, limitRounds: 5 });
    expect(following.breath).not.toBe(round.breath);
  });

  it('the environment of a PATCH keeps the fog and the temperature left out, and clears them with null', () => {
    const current = new GameEnvironment(0, 0, 'dark', 'heavy', { kind: 'cold', temperature: -80, severity: null });
    const kept = GameEnvironment.merge(current, new GameEnvironment(-10, 0));
    expect(kept).toMatchObject({ temperatureFatigueModifier: -10, light: 'dark', fog: 'heavy' });
    expect(kept.extremeTemperature).toMatchObject({ temperature: -80 });
    const cleared = GameEnvironment.merge(current, new GameEnvironment(0, 0, undefined, null, null));
    expect(cleared.fog).toBeUndefined();
    expect(cleared.extremeTemperature).toBeUndefined();
    expect(GameEnvironment.resolveTemperature(current)).toMatchObject({ criticalType: 'O', severity: 'B' });
  });
});

describe('Hazard of an extreme temperature (spec 079, C3)', () => {
  const context = { gameId: 'game-1', gameName: 'Moria', round: 1, phase: 2 };
  const request = (overrides: Partial<HazardRequest>): HazardRequest => ({
    kind: 'extreme-temperature',
    distanceFeet: 0,
    roll: 0,
    criticalRolls: [],
    db: null,
    note: null,
    deliberate: false,
    heightFeet: null,
    fallControlActionId: null,
    objectSize: null,
    weightLbs: null,
    shield: false,
    ...overrides,
  });
  const setup = () => {
    const lookups: CriticalTableLookupRequest[] = [];
    const attackLookup = vi.fn();
    const attackTable: AttackTablePort = { lookup: attackLookup };
    const criticalTable: CriticalTablePort = {
      lookup: vi.fn((req: CriticalTableLookupRequest) => {
        lookups.push(req);
        return Promise.resolve(new CriticalResult('Scalded.', 6, 'chest', []));
      }),
    };
    return { service: new HazardAttackService(attackTable, criticalTable), lookups, attackLookup };
  };

  it('rolls the critical of Table 15-3 without an attack table, or leaves it as an alert', async () => {
    const { service, lookups, attackLookup } = setup();
    const actor = load({ hp: [50, 50] });
    const hazard = await service.resolve(actor, request({ temperatureKind: 'steam', temperature: 180, criticalRolls: [40] }), 0, context);
    expect(attackLookup).not.toHaveBeenCalled();
    expect(lookups[0]).toMatchObject({ criticalType: 'STEAM', criticalSeverity: 'B', roll: 40 });
    expect(hazard).toMatchObject({ kind: 'extreme-temperature', attackTable: null, severity: 'B', damage: 0 });
    expect(hazard.temperature).toEqual({ kind: 'steam', celsius: 180, criticalType: 'steam', severitySource: 'table' });
    expect(actor.hp.current).toBe(44);

    const frozen = load();
    const cold = await service.resolve(frozen, request({ temperature: -180 }), 0, context);
    expect(cold.criticals.map(critical => [critical.criticalType, critical.criticalSeverity])).toEqual([
      ['O', 'E'],
      ['O', 'A'],
    ]);
    expect(pending(frozen, 'critical')).toHaveLength(2);
  });

  it('a temperature that is not extreme is refused', async () => {
    const { service } = setup();
    await expect(service.resolve(load(), request({ temperature: 30 }), 0, context)).rejects.toMatchObject({
      code: 'err-temperature-not-extreme',
    });
  });
});

describe('Drowning and suffocation (spec 079, C4, §15.2)', () => {
  it('limit: 12 + Co bonus prepared, the bonus alone unprepared, at least 1', () => {
    expect(breathLimitRounds({ prepared: true, constitutionBonus: 5 })).toBe(17);
    expect(breathLimitRounds({ prepared: true, constitutionBonus: -15 })).toBe(1);
    expect(breathLimitRounds({ prepared: false, constitutionBonus: 4 })).toBe(4);
    expect(breathLimitRounds({ prepared: false, constitutionBonus: -3 })).toBe(1);
    // Phase 7 hook: Breath Holding replaces the base
    expect(breathLimitRounds({ prepared: true, constitutionBonus: 5, talentRounds: 36 })).toBe(36);
  });

  it('checks start Easy and get one step harder each round, up to Nearly Impossible', () => {
    expect([0, 1, 2, 3, 8, 20].map(breathCheckDifficulty)).toEqual(['e', 'l', 'm', 'h', 'ni', 'ni']);
    expect(suffocationHits(() => 0)).toBe(1);
    expect(suffocationHits(() => 0.999)).toBe(10);
  });

  it('past the limit each upkeep asks for a breath check, with +25 of an active Adrenal Focus', () => {
    const first = holding(1);
    first.applyUpkeep();
    expect(pending(first, 'breath-check')).toHaveLength(0);
    const second = next(first);
    second.effects.push(new ActorRoundEffect('af', ADRENAL_FOCUS, 25, 3));
    second.applyUpkeep();
    second.applyUpkeep();
    expect(pending(second, 'breath-check')).toHaveLength(1);
    expect(modifier(second, 'breath-check', 'difficulty')?.modifier).toBe('e');
    expect(modifier(second, 'breath-check', 'heldRounds')?.value).toBe(2);
    expect(modifier(second, 'breath-check', 'adrenal-focus')?.value).toBe(25);
    second.resolveAlert(pending(second, 'breath-check')[0].id, 'passed');
    const third = next(second);
    third.applyUpkeep();
    expect(modifier(third, 'breath-check', 'difficulty')?.modifier).toBe('l');
  });

  it('a breath check needs its outcome', () => {
    const round = next(holding(1));
    round.applyUpkeep();
    const alert = pending(round, 'breath-check')[0];
    expect(() => round.resolveAlert(alert.id)).toThrow(expect.objectContaining({ code: 'err-alert-not-resolvable' }));
    expect(alert.status).toBe('pending');
  });

  it('a failed check underwater: suffocating (1d10 hits per upkeep) and stunned -50; no more checks', () => {
    const round = next(holding(1, { underwater: true }));
    round.applyUpkeep();
    round.resolveAlert(pending(round, 'breath-check')[0].id, 'failed');
    expect(round.effects.some(each => each.status === SUFFOCATING && each.data?.underwater === true)).toBe(true);
    expect(stunPenalty(round)).toBe(-50);
    expect(round.breath?.failedRound).toBe(2);
    const after = next(round);
    const hp = after.hp.current;
    after.applyUpkeep({ random: () => 0.65 });
    expect(after.hp.current).toBe(hp - 7);
    expect(after.hpLog.some(entry => entry.kind === 'suffocation' && entry.amount === -7)).toBe(true);
    expect(pending(after, 'breath-check')).toHaveLength(0);
  });

  it('breathing again ends the suffocation and closes the pending checks; the stun stays', () => {
    const round = next(holding(1, { underwater: true }));
    round.applyUpkeep();
    round.resolveAlert(pending(round, 'breath-check')[0].id, 'failed');
    const after = next(round);
    after.applyUpkeep({ random: () => 0 });
    after.stopBreath();
    expect(after.breath).toBeNull();
    expect(after.hasEffect(SUFFOCATING)).toBe(false);
    expect(stunPenalty(after)).toBe(-50);
    expect(() => after.stopBreath()).toThrow(expect.objectContaining({ code: 'err-breath-not-held' }));
    const again = holding(3);
    expect(() =>
      again.startBreath({
        prepared: true,
        underwater: false,
        constitutionBonus: 0,
        constitutionSource: 'none',
        limitRounds: 12,
        note: null,
      }),
    ).toThrow(expect.objectContaining({ code: 'err-breath-already-held' }));
  });

  it('starting the breath reads the Co bonus of the sheet, the one sent for an NPC, or 0', async () => {
    const saved: ActorRound[] = [];
    const run = async (round: ActorRound, bonus: number | undefined, prepared = true, character?: Partial<Character>) => {
      const repository = {
        findById: vi.fn(() => Promise.resolve(round)),
        update: vi.fn((entity: ActorRound) => {
          saved.push(entity);
          return Promise.resolve(entity);
        }),
      } as unknown as ActorRoundRepository;
      const games = { findById: vi.fn(() => Promise.resolve(undefined)) } as unknown as GameRepository;
      const characters: CharacterPort = {
        findById: vi.fn(() => Promise.resolve(character as Character | undefined)),
        findByGameId: vi.fn(),
      };
      const handler = new StartBreathHandler(repository, games, sheetsOf(characters));
      return handler.execute(new StartBreathCommand(round.id, prepared, false, bonus, null, 'user-1', []));
    };
    const character = load();
    const fromSheet = await run(character, undefined, true, { statistics: { co: { totalBonus: 6 } } });
    expect(fromSheet.breath).toMatchObject({ constitutionBonus: 6, constitutionSource: 'sheet', limitRounds: 18, sinceRound: 1 });
    const sent = await run(load(), 3, false);
    expect(sent.breath).toMatchObject({ constitutionBonus: 3, constitutionSource: 'request', limitRounds: 3 });
    const npc = load();
    (npc as { actorType: string }).actorType = 'npc';
    const none = await run(npc, undefined, false);
    expect(none.breath).toMatchObject({ constitutionBonus: 0, constitutionSource: 'none', limitRounds: 1 });
  });
});

describe('Fog (spec 079, C5, Table 15-7)', () => {
  it('visual maneuvers take the fog; hearing only beyond the visual range', () => {
    expect(Object.values(FOG_TABLE).map(level => level.perception)).toEqual([-15, -25, -50, -75]);
    expect(fogModifiers('heavy', 'vision', false)).toEqual([{ key: 'fog', value: -50, params: { fog: 'heavy', visibilityFeet: 50 } }]);
    expect(fogModifiers('heavy', 'hearing', false)).toEqual([]);
    expect(fogModifiers('light', 'hearing', true)).toEqual([{ key: 'fog-beyond-visual-range', value: -20, params: { fog: 'light' } }]);
    expect(fogModifiers('extreme', 'smell', true)).toEqual([]);
    expect(fogModifiers(null, 'vision', false)).toEqual([]);
  });
});
