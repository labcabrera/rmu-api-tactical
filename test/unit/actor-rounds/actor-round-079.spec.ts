import { describe, expect, it, vi } from 'vitest';
import type { AttackTablePort } from '../../../src/modules/actions/application/ports/attack-table.port.js';
import type { CriticalTablePort } from '../../../src/modules/actions/application/ports/critical-table.port.js';
import { AttackTableEntry } from '../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { CriticalResult } from '../../../src/modules/actions/domain/value-objects/critical-result.vo.js';
import type { HazardRequest } from '../../../src/modules/actor-rounds/application/cqrs/commands/resolve-hazard.command.js';
import { HazardAttackService } from '../../../src/modules/actor-rounds/application/services/hazard-attack.service.js';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundEffect } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { ActorRoundNpcMapperAdapter } from '../../../src/modules/actor-rounds/infrastructure/mappers/actor-round-npc-mapper.adapter.js';
import { ActorRoundDto } from '../../../src/modules/actor-rounds/interfaces/http/dto/actor-round.dto.js';
import { Actor } from '../../../src/modules/games/domain/value-objects/actor.vo.js';
import type { Npc } from '../../../src/modules/npcs/application/ports/npc.port.js';
import { capSeverity } from '../../../src/modules/shared/domain/severity.js';
import { effect, load } from './actor-round-test.factory.js';

const stun = (value: number, rounds: number) => effect('stunned', value, rounds);
const criticalEffect = (status: string, value: number, criticalKey: string) =>
  new ActorRoundEffect('e-1', status, value, undefined, undefined, undefined, undefined, undefined, {
    kind: 'critical',
    tacticalGameId: 'game-1',
    round: 1,
    criticalKey,
  });

describe('Workspace spec 079, A3: creatures immune to stun (§9.8 Stun)', () => {
  it('turns any stun into a single -25 for 1 round', () => {
    const round = load();
    round.stunImmune = true;

    round.applyAttackResults(0, [stun(-75, 5)], undefined);

    expect(round.effects.filter(e => e.status === 'stunned')).toEqual([expect.objectContaining({ value: -25, rounds: 1 })]);
    expect(round.getPenaltySum()).toBe(-25);
  });

  it('does not stack: a new stun replaces the old one', () => {
    const round = load();
    round.stunImmune = true;

    round.applyAttackResults(0, [stun(-50, 2)], undefined);
    round.applyAttackResults(0, [stun(-25, 3), stun(-75, 1)], undefined);

    expect(round.effects.filter(e => e.status === 'stunned')).toHaveLength(1);
    expect(round.getPenaltySum()).toBe(-25);
  });

  it('keeps adding up the stuns of an actor that is not immune', () => {
    const round = load();
    round.applyAttackResults(0, [stun(-50, 2), stun(-50, 1)], undefined);
    expect(round.effects.find(e => e.status === 'stunned')).toMatchObject({ value: -50, rounds: 3 });
  });

  it('comes from the critical code @ of the NPC and goes on round to round', () => {
    const npc = {
      id: 'skeleton',
      name: 'Skeleton',
      category: 'undead',
      level: 3,
      movement: [{ mode: 'walk', baseRate: 20, maxPace: 'run' }],
      size: 'medium',
      hp: 40,
      deathHits: null,
      at: 1,
      db: 10,
      shield: null,
      initiative: 0,
      attacks: [],
      criticalCodes: { stunImmune: true },
    } as unknown as Npc;
    const actor = Actor.fromProps({ id: 'sk-1', npcId: 'skeleton', name: 'Skeleton 1', faction: { id: 'f', name: 'F' } } as never);
    const round = new ActorRoundNpcMapperAdapter().toActorRound('game-1', 1, actor, npc);

    expect(round.stunImmune).toBe(true);
    expect(ActorRoundDto.fromEntity(round).stunImmune).toBe(true);
    expect(ActorRound.createFromPrevious(round).stunImmune).toBe(true);
    expect(ActorRound.fromProps({ ...round.getProps(), stunImmune: undefined }).stunImmune).toBe(false);
  });
});

describe('Workspace spec 079, A3: thresholds of the total penalties (§9.8 Penalties)', () => {
  const alerts = (round: ActorRound, type: string) => round.alerts.filter(alert => alert.type === type && alert.status === 'pending');
  const reasons = (round: ActorRound) => alerts(round, 'endurance').map(alert => alert.getModifierText('reason'));

  it('asks for an endurance roll on an action with effort from -100, once per round', () => {
    const round = load({ penalties: [['critical', -90]], hp: [100, 40] });

    // -90 critical and -20 for the hits lost: the hits count in the total (decision A3)
    expect(round.getPenaltySum()).toBe(-110);
    expect(round.addPenaltyExertionAlert()).toBe(true);
    expect(round.addPenaltyExertionAlert()).toBe(false);
    expect(reasons(round)).toEqual(['penalty-exertion']);
    expect(alerts(round, 'endurance')[0].getModifierValue('total')).toBe(-110);
  });

  it('asks for nothing above -100', () => {
    const round = load({ penalties: [['critical', -60]] });
    expect(round.addPenaltyExertionAlert()).toBe(false);
    round.applyUpkeep();
    expect(round.alerts).toEqual([]);
  });

  it('from -200 the actor is dying: an endurance roll every round, raised in the upkeep', () => {
    const round = load({ penalties: [['critical', -210]] });

    round.applyUpkeep();
    round.applyUpkeep();

    expect(reasons(round)).toEqual(['penalty-dying']);
    // An action with effort does not ask for another one while it is pending.
    expect(round.addPenaltyExertionAlert()).toBe(false);
  });

  it('from -300 the game master confirms the death; it is never applied by itself', () => {
    const round = load({ penalties: [['critical', -320]] });

    round.applyUpkeep();
    const [death] = alerts(round, 'death-threshold');

    expect(death.getModifierValue('total')).toBe(-320);
    expect(round.isDead()).toBe(false);
    round.applyUpkeep();
    expect(alerts(round, 'death-threshold')).toHaveLength(1);

    round.resolveAlert(death.id, 'confirmed');
    expect(round.isDead()).toBe(true);
    expect(death.getModifierText('outcome')).toBe('confirmed');
  });

  it('lets the game master dismiss the death', () => {
    const round = load({ penalties: [['critical', -300]] });
    round.applyUpkeep();
    const [death] = alerts(round, 'death-threshold');

    round.resolveAlert(death.id);

    expect(round.isDead()).toBe(false);
    expect(death).toMatchObject({ status: 'resolved' });
    expect(death.getModifierText('outcome')).toBe('dismissed');
  });

  it('keeps the threshold rolls apart from the fatigue ones', () => {
    const round = load({ penalties: [['critical', -150]] });
    round.addPenaltyExertionAlert();
    // Fatigue below 100 no longer clears it, and its roll does not use up the activity points
    round.addFatigue(10);
    expect(reasons(round)).toEqual(['penalty-exertion']);
    const alertId = alerts(round, 'endurance')[0].id;
    round.fatigue.accumulator = 150;

    round.applyEnduranceResult(0, 0, alertId);

    expect(round.fatigue.accumulator).toBe(150);
    expect(alerts(round, 'endurance').map(alert => alert.getModifierText('reason'))).toEqual([]);
  });
});

describe('Workspace spec 079, A4: knocked back (§9.8 Knocked Back)', () => {
  it('turns the critical effect into a knocked-back alert with the severity of the critical', () => {
    const round = load();

    round.applyAttackResults(0, [criticalEffect('knocked_back_distance', 10, 'K-C-45')], undefined);

    expect(round.effects).toEqual([]);
    const [alert] = round.alerts;
    expect(alert).toMatchObject({ type: 'knocked-back', status: 'pending' });
    expect(alert.getModifierValue('feet')).toBe(10);
    expect(alert.getModifierText('severityCap')).toBe('C');
    expect(alert.getModifierText('criticalKey')).toBe('K-C-45');
    round.resolveAlert(alert.id);
    expect(alert.status).toBe('resolved');
  });

  it('reads the severity of critical types with dashes, and raises nothing without a distance', () => {
    expect(ActorRound.severityOfCriticalKey('steam-B-12')).toBe('B');
    expect(ActorRound.severityOfCriticalKey('nonsense')).toBeNull();
    const round = load();
    round.applyAttackResults(0, [criticalEffect('knocked_back_distance', 0, 'K-A-10')], undefined);
    expect(round.alerts).toEqual([]);
  });

  it('caps the severity of the hazard at the one of the critical', () => {
    expect(capSeverity('E', 'C')).toBe('C');
    expect(capSeverity('G', 'B')).toBe('B');
    expect(capSeverity('A', 'C')).toBe('A');
    expect(capSeverity(null, 'C')).toBeNull();
    expect(capSeverity('D', null)).toBe('D');
  });

  it('resolves the alert with a hazard whose critical is no worse than the one that knocked the actor back', async () => {
    const attackTable: AttackTablePort = { lookup: vi.fn(() => Promise.resolve(new AttackTableEntry('30EK', 30, 'K', 'E'))) };
    const criticalTable: CriticalTablePort = { lookup: vi.fn(() => Promise.resolve(new CriticalResult('Hit the wall.', 3, 'chest', []))) };
    const service = new HazardAttackService(attackTable, criticalTable);
    const round = load({ hp: [100, 100], size: 0 });
    round.applyAttackResults(0, [criticalEffect('knocked_back_distance', 10, 'K-B-45')], undefined);
    const alert = round.pendingKnockedBack(round.alerts[0].id);
    const request: HazardRequest = {
      kind: 'fall',
      distanceFeet: 10,
      roll: 80,
      criticalRolls: [50],
      db: null,
      note: null,
      deliberate: false,
      heightFeet: null,
      fallControlActionId: null,
      objectSize: null,
      weightLbs: null,
      shield: true,
      knockedBackAlertId: alert.id,
    };

    const hazard = await service.resolve(round, request, 0, { gameId: 'game-1', round: 1, phase: 2 }, alert.getModifierText('severityCap'));
    round.resolveKnockedBack(alert.id, hazard.id);

    expect(hazard).toMatchObject({ originalSeverity: 'E', severity: 'B', severityCap: 'B', knockedBackAlertId: alert.id });
    expect(hazard.criticals).toEqual([expect.objectContaining({ criticalSeverity: 'B' })]);
    expect(alert.status).toBe('resolved');
    expect(alert.getModifierText('hazardId')).toBe(hazard.id);
    expect(() => round.pendingKnockedBack(alert.id)).toThrow(expect.objectContaining({ code: 'err-alert-not-resolvable' }));
  });
});
