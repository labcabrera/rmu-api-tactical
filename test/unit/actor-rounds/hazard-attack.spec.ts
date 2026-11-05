import { describe, expect, it, vi } from 'vitest';
import type { AttackTableLookupRequest, AttackTablePort } from '../../../src/modules/actions/application/ports/attack-table.port.js';
import type { CriticalTableLookupRequest, CriticalTablePort } from '../../../src/modules/actions/application/ports/critical-table.port.js';
import { AttackTableEntry } from '../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { CriticalEffect, CriticalResult } from '../../../src/modules/actions/domain/value-objects/critical-result.vo.js';
import type { HazardRequest } from '../../../src/modules/actor-rounds/application/cqrs/commands/resolve-hazard.command.js';
import { HazardAttackService } from '../../../src/modules/actor-rounds/application/services/hazard-attack.service.js';
import { ActorRoundShield } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-shield.vo.js';
import { ActorRoundDefense } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-defense.vo.js';
import { adjustSeverity, expandSeverity, severitySteps } from '../../../src/modules/shared/domain/severity.js';
import { stepsOfWeight } from '../../../src/modules/shared/domain/size-scale.js';
import { load } from './actor-round-test.factory.js';

/*
 * Workspace spec 077, block D: the numbers of §15.4 and §15.5 (a 20' fall of a 6' character, an elephant falling 30'
 * on a medium one); the table entries and criticals are made up.
 */

const request = (overrides: Partial<HazardRequest> = {}): HazardRequest => ({
  kind: 'fall',
  distanceFeet: 20,
  roll: 50,
  criticalRolls: [],
  db: null,
  note: null,
  deliberate: false,
  heightFeet: null,
  fallControlActionId: null,
  objectSize: null,
  weightLbs: null,
  shield: true,
  ...overrides,
});

const context = { gameId: 'game-1', gameName: 'Moria', round: 1, phase: 2 };

const setup = (entry = new AttackTableEntry('10CI', 10, 'I', 'C'), critical = new CriticalResult('Crushed.', 5, 'leg', [])) => {
  const attackLookups: AttackTableLookupRequest[] = [];
  const criticalLookups: CriticalTableLookupRequest[] = [];
  const attackTable: AttackTablePort = {
    lookup: vi.fn((req: AttackTableLookupRequest) => {
      attackLookups.push(req);
      return Promise.resolve(new AttackTableEntry(entry.text, entry.damage, entry.criticalType, entry.criticalSeverity));
    }),
  };
  const criticalTable: CriticalTablePort = {
    lookup: vi.fn((req: CriticalTableLookupRequest) => {
      criticalLookups.push(req);
      return Promise.resolve(critical);
    }),
  };
  return { service: new HazardAttackService(attackTable, criticalTable), attackLookups, criticalLookups };
};

describe('Severity scale shared by attacks and hazards (workspace spec 077, decision D1)', () => {
  it('lists the non-zero steps in order and adjusts the severity', () => {
    expect(severitySteps({ 'fall-control': -1, 'attack-size': 3, 'target-size': 0 })).toEqual([
      { key: 'attack-size', value: 3 },
      { key: 'fall-control', value: -1 },
    ]);
    expect(adjustSeverity('C', 3, false)).toBe('F');
    expect(adjustSeverity('A', -1, false)).toBe('Z');
    expect(adjustSeverity('A', -2, false)).toBeNull();
    expect(expandSeverity('F')).toEqual(['E', 'A']);
  });

  it('gives the size of an object by its weight (Table 9-4a)', () => {
    expect(stepsOfWeight(0.5)).toBe(-4);
    expect(stepsOfWeight(150)).toBe(0);
    expect(stepsOfWeight(300)).toBe(1);
    expect(stepsOfWeight(8000)).toBe(3);
    expect(stepsOfWeight(60000)).toBe(5);
  });
});

describe('HazardAttackService (workspace spec 077, decisions D1-D2)', () => {
  it('§15.4: a deliberate 20-foot jump of a 6-foot character is a Crush attack at +14 with only magical DB', async () => {
    const { service, attackLookups } = setup();
    const actor = load({ hp: [60, 60], size: 0 });
    actor.height = 6;
    const hazard = await service.resolve(actor, request({ deliberate: true }), 0, context);
    expect(hazard).toMatchObject({ attackTable: 'crush', ob: 14, db: 0, total: 64, attackSize: 0, heightFeet: 6 });
    expect(attackLookups[0]).toMatchObject({ attackTable: 'crush', roll: 64, armor: 1 });
    expect(actor.hazards).toHaveLength(1);
  });

  it('an accidental fall counts every foot, and the height sent wins over the actor round one', async () => {
    const { service } = setup();
    const actor = load({ size: 0 });
    actor.height = 6;
    const hazard = await service.resolve(actor, request({ distanceFeet: 20, heightFeet: 5, deliberate: true, db: 10 }), 0, context);
    expect(hazard).toMatchObject({ ob: 15, db: 10, total: 55 });
    const accidental = await service.resolve(actor, request({ distanceFeet: 20 }), 0, context);
    expect(accidental.ob).toBe(20);
  });

  it('§15.5: an elephant (huge) falling 30 feet on a medium actor is a +30 huge Crush with +3 critical severities', async () => {
    const { service, attackLookups } = setup(new AttackTableEntry('12CI', 12, 'I', 'C'));
    const actor = load({ hp: [100, 100], size: 0 });
    const hazard = await service.resolve(actor, request({ kind: 'falling-object', distanceFeet: 30, objectSize: 'huge' }), 0, context);
    expect(hazard).toMatchObject({ attackTable: 'crush', attackSize: 3, ob: 30, db: 10, total: 70, multiplier: 3, baseDamage: 12 });
    expect(hazard.damage).toBe(36);
    expect(hazard.severitySteps).toEqual([{ key: 'attack-size', value: 3 }]);
    expect(hazard).toMatchObject({ originalSeverity: 'C', severity: 'F' });
    expect(hazard.criticals.map(critical => critical.criticalSeverity)).toEqual(['E', 'A']);
    expect(attackLookups[0].roll).toBe(70);
    expect(actor.hp.current).toBe(64);
    expect(actor.hpLog).toContainEqual(expect.objectContaining({ kind: 'hazard', amount: -36, phase: 2 }));
  });

  it('§15.5 and P12: a smaller object is a Rock attack where the shield counts; the same size is Crush', async () => {
    const { service } = setup();
    const actor = load({ size: 0 });
    actor.defense = new ActorRoundDefense(10, 1, null, 4, null, null, new ActorRoundShield(20, 1, 0), 0);
    const rock = await service.resolve(actor, request({ kind: 'falling-object', distanceFeet: 10, weightLbs: 10 }), 0, context);
    expect(rock).toMatchObject({ attackTable: 'rock', attackSize: -2, shield: true, db: 30, armor: 4 });
    const noShield = await service.resolve(
      actor,
      request({ kind: 'falling-object', distanceFeet: 10, weightLbs: 10, shield: false }),
      0,
      context,
    );
    expect(noShield.db).toBe(10);
    const same = await service.resolve(actor, request({ kind: 'falling-object', distanceFeet: 10, objectSize: 'medium' }), 0, context);
    expect(same).toMatchObject({ attackTable: 'crush', shield: false, db: 10 });
  });

  it('decision D4: the fall control steps move the critical of the fall', async () => {
    const { service } = setup();
    const hazard = await service.resolve(load({ size: 0 }), request(), -1, context);
    expect(hazard).toMatchObject({ fallControlSteps: -1, originalSeverity: 'C', severity: 'B' });
    expect(hazard.severitySteps).toEqual([{ key: 'fall-control', value: -1 }]);
  });

  it('without critical rolls each critical is a critical alert with origin hazard', async () => {
    const { service } = setup(new AttackTableEntry('12CI', 12, 'I', 'C'));
    const actor = load({ hp: [100, 100], size: 0 });
    const hazard = await service.resolve(actor, request({ kind: 'falling-object', distanceFeet: 30, objectSize: 'huge' }), 0, context);
    const alerts = actor.alerts.filter(alert => alert.type === 'critical');
    expect(alerts).toHaveLength(2);
    expect(alerts[0].getModifierText('origin')).toBe('hazard');
    expect(alerts[0].getModifierText('hazardId')).toBe(hazard.id);
    expect(alerts.map(alert => alert.getModifierText('criticalSeverity'))).toEqual(['E', 'A']);
    expect(hazard.criticals.map(critical => critical.alertId)).toEqual(alerts.map(alert => alert.id));
  });

  it('with critical rolls the criticals are applied with a hazard source', async () => {
    const critical = new CriticalResult('Leg crushed.', 5, 'leg', [
      new CriticalEffect('penalty', undefined, -20, undefined, undefined),
      new CriticalEffect('stunned', 1, -25, undefined, undefined),
    ]);
    const { service, criticalLookups } = setup(new AttackTableEntry('10CI', 10, 'I', 'C'), critical);
    const actor = load({ hp: [60, 60], size: 0 });
    const hazard = await service.resolve(actor, request({ criticalRolls: [45] }), 0, context);
    expect(criticalLookups[0]).toMatchObject({ criticalType: 'I', criticalSeverity: 'C', roll: 45 });
    expect(hazard.criticals[0]).toMatchObject({ roll: 45, damage: 5, text: 'Leg crushed.', location: 'leg', alertId: null });
    expect(actor.hp.current).toBe(45);
    expect(actor.injuries[0]).toMatchObject({ penalty: -20, location: 'leg' });
    expect(actor.injuries[0].source).toMatchObject({ kind: 'hazard', criticalKey: 'I-C-45', tacticalGameName: 'Moria' });
    expect(actor.effects.find(effect => effect.status === 'stunned')?.source?.kind).toBe('hazard');
    expect(actor.alerts).toHaveLength(0);
  });

  it('rejects a fall of 0 feet (err-hazard-invalid-distance) and a falling object without a size', async () => {
    const { service } = setup();
    await expect(service.resolve(load({ size: 0 }), request({ distanceFeet: 0 }), 0, context)).rejects.toMatchObject({
      code: 'err-hazard-invalid-distance',
    });
    await expect(service.resolve(load({ size: 0 }), request({ kind: 'falling-object' }), 0, context)).rejects.toMatchObject({
      code: 'validation',
    });
    await expect(service.resolve(load({ size: 0 }), request({ deliberate: true }), 0, context)).rejects.toMatchObject({
      code: 'validation',
    });
  });
});
