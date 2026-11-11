import { describe, expect, it, vi } from 'vitest';
import type { ManeuverPort } from '../../../src/modules/actions/application/ports/maneuver.port.js';
import {
  AmputateLimbCommand,
  ReviveActorCommand,
} from '../../../src/modules/actor-rounds/application/cqrs/commands/limb-and-life.commands.js';
import {
  AmputateLimbHandler,
  ReviveActorHandler,
} from '../../../src/modules/actor-rounds/application/cqrs/handlers/limb-and-life.handlers.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { MedicalRollService } from '../../../src/modules/actor-rounds/application/services/medical-roll.service.js';
import type { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { LimbAndLifeRules, SOUL_DEPARTURE_ROUNDS } from '../../../src/modules/actor-rounds/domain/services/limb-and-life-rules.js';
import { DEAD, DYING, UNCONSCIOUS } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { buildInjury, type Injury } from '../../../src/modules/actor-rounds/domain/value-objects/injury.vo.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import type { CharacterPort } from '../../../src/modules/strategic/application/ports/character.port.js';
import { sheetsOf } from '../support/actor-sheets.js';
import { effect, load } from './actor-round-test.factory.js';

// Workspace spec 079, C1 (amputation and lost limbs) and C6 (death and revival) in tactical. Only numbers of §13.

const SOURCE = { kind: 'manual' as const };

const limbWound = (id: string, overrides: Partial<Injury> = {}): Injury => ({
  ...buildInjury({ id, type: 'cut-burn', location: 'arm', side: 'left', penalty: -20, bleeding: 4, source: { kind: 'critical' } }),
  ...overrides,
});

/** The effects added as the critical results and the effects endpoint add them. */
const addEffect = (round: ActorRound, status: string) =>
  (round as unknown as { addEffect: (each: ReturnType<typeof effect>, application: undefined) => void }).addEffect(
    effect(status),
    undefined,
  );

const alertOf = (round: ActorRound, type: string) => round.alerts.find(alert => alert.type === type && alert.status === 'pending');

describe('LimbAndLifeRules (spec 079, §13.1 and §13.2)', () => {
  it('the stump of an emergency amputation: -40 bone, muscle, skin and burn, at risk of permanent harm', () => {
    const stump = LimbAndLifeRules.stumpInjuries('leg', 'right', SOURCE);
    expect(stump.map(injury => injury.type)).toEqual(['bone', 'muscle-tendon', 'skin-tissue', 'cut-burn']);
    expect(stump.every(injury => injury.penalty === -40 && injury.location === 'leg' && injury.side === 'right')).toBe(true);
    expect(stump.every(injury => injury.flags?.includes('permanent-risk'))).toBe(true);
  });

  it('revival difficulties: respiratory -50, cardiac -100, defibrillation -20 to -70', () => {
    expect(LimbAndLifeRules.reviveDifficulty('respiratory')).toBe(-50);
    expect(LimbAndLifeRules.reviveDifficulty('cardiac', -20)).toBe(-100);
    expect(LimbAndLifeRules.reviveDifficulty('defibrillation')).toBe(-20);
    expect(LimbAndLifeRules.reviveDifficulty('defibrillation', -55)).toBe(-55);
    expect(() => LimbAndLifeRules.reviveDifficulty('defibrillation', -80)).toThrow(
      expect.objectContaining({ code: 'err-revive-invalid-difficulty' }),
    );
    expect(() => LimbAndLifeRules.reviveDifficulty('defibrillation', -10)).toThrow(
      expect.objectContaining({ code: 'err-revive-invalid-difficulty' }),
    );
  });

  it('a success revives; a defibrillation also on a partial success', () => {
    expect(LimbAndLifeRules.revives('respiratory', 'success')).toBe(true);
    expect(LimbAndLifeRules.revives('cardiac', 'partial-success')).toBe(false);
    expect(LimbAndLifeRules.revives('defibrillation', 'partial-success')).toBe(true);
    expect(LimbAndLifeRules.revives('defibrillation', 'failure')).toBe(false);
  });

  it('a dangerous defibrillation shocks the patient worse the worse the roll', () => {
    expect(LimbAndLifeRules.defibrillationShock('absolute-failure')).toEqual({ severity: 'D', dice: 4 });
    expect(LimbAndLifeRules.defibrillationShock('failure')).toEqual({ severity: 'C', dice: 3 });
    expect(LimbAndLifeRules.defibrillationShock('partial-success')).toEqual({ severity: 'B', dice: 2 });
    expect(LimbAndLifeRules.defibrillationShock('success')).toEqual({ severity: 'A', dice: 1 });
    expect(LimbAndLifeRules.defibrillationShock('absolute-success')).toBeNull();
  });

  it('dice: the sum given, or rolled; an impossible sum is refused', () => {
    expect(LimbAndLifeRules.d10(2, 13)).toBe(13);
    expect(LimbAndLifeRules.d10(2, undefined, () => 0.99)).toBe(20);
    expect(() => LimbAndLifeRules.d10(2, 21)).toThrow(expect.objectContaining({ code: 'err-invalid-dice-roll' }));
    expect(() => LimbAndLifeRules.d10(2, 1)).toThrow(expect.objectContaining({ code: 'err-invalid-dice-roll' }));
  });
});

describe('lost limbs (spec 079, C1)', () => {
  it('a critical injury flagged limb-loss asks to confirm the loss; a manual one does not', () => {
    const round = load();
    round.addInjury(limbWound('critical-cut', { flags: ['limb-loss'] }));
    round.addInjury(limbWound('manual-cut', { flags: ['limb-loss'], source: { kind: 'manual' } }));
    const alerts = round.alerts.filter(alert => alert.type === 'limb-loss');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].getModifierText('injuryId')).toBe('critical-cut');
    expect(alerts[0].getModifierText('origin')).toBe('critical');
    expect(alerts[0].getModifierText('side')).toBe('left');
  });

  it('confirming the alert loses the limb and ends its bleeding; dismissing it keeps the limb', () => {
    const round = load();
    round.addInjury(limbWound('cut', { flags: ['limb-loss'] }));
    round.resolveAlert(alertOf(round, 'limb-loss')!.id, 'confirmed');
    expect(round.lostLimbs).toEqual([expect.objectContaining({ location: 'arm', side: 'left', cause: 'limb-loss', injuryId: 'cut' })]);
    expect(round.injuries[0]).toMatchObject({ bleeding: 0, bleedingControl: 'cauterized' });
    expect(round.lostArms()).toHaveLength(1);

    const other = load();
    other.addInjury(limbWound('cut', { flags: ['limb-loss'] }));
    other.resolveAlert(alertOf(other, 'limb-loss')!.id);
    expect(other.lostLimbs).toEqual([]);
  });

  it('asks for the side when the injury has none, and refuses a limb lost already', () => {
    const round = load();
    round.addInjury(limbWound('cut', { flags: ['limb-loss'], side: undefined, location: 'leg' }));
    const alertId = alertOf(round, 'limb-loss')!.id;
    expect(() => round.resolveAlert(alertId, 'confirmed')).toThrow(expect.objectContaining({ code: 'err-limb-loss-side-required' }));
    round.alerts.find(alert => alert.id === alertId)!.status = 'pending';
    round.resolveAlert(alertId, 'confirmed', 'right');
    expect(round.lostLimbs[0]).toMatchObject({ location: 'leg', side: 'right' });
    expect(() => round.loseLimb({ location: 'leg', side: 'right' })).toThrow(expect.objectContaining({ code: 'err-limb-already-lost' }));
  });

  it('a lost leg caps the pace at creep', () => {
    const round = load();
    expect(round.injuryPaceLimit()).toBeUndefined();
    round.loseLimb({ location: 'leg', side: 'left' });
    expect(round.injuryPaceLimit()).toBe('creep');
  });

  it('an amputation: the stump injuries, the critical of a failure and the dying of system shock', () => {
    const round = load();
    round.addInjury(limbWound('cut', { tourniquet: { tightSince: 1, loosenedAt: null } }));
    const stump = LimbAndLifeRules.stumpInjuries('arm', 'left', SOURCE);
    round.amputate({ location: 'arm', side: 'left', injuryId: 'cut' }, stump, { critical: true, dyingRounds: 9 }, SOURCE);
    expect(round.lostLimbs[0]).toMatchObject({ cause: 'amputation', injuryId: 'cut' });
    expect(round.injuries.find(injury => injury.id === 'cut')!.tourniquet).toBeNull();
    expect(round.injuries).toHaveLength(5);
    const critical = alertOf(round, 'critical')!;
    expect(critical.getModifierText('origin')).toBe('amputation');
    expect(critical.getModifierText('criticalType')).toBe('S');
    expect(critical.getModifierText('criticalSeverity')).toBe('D');
    expect(critical.getModifierText('location')).toBe('arms');
    expect(round.effects.find(each => each.status === DYING)).toMatchObject({ rounds: 9 });
  });
});

describe('death and revival (spec 079, C6)', () => {
  it('keeps the round of the death and counts down the 60 rounds of the soul', () => {
    const round = load({ round: 3 });
    expect(round.soulRoundsLeft()).toBeNull();
    addEffect(round, DEAD);
    expect(round.deathRound).toBe(3);
    expect(round.soulRoundsLeft()).toBe(SOUL_DEPARTURE_ROUNDS);
    // A second death effect does not move the round
    addEffect(round, DEAD);
    expect(round.deathRound).toBe(3);
    const later = load({ round: 3 + SOUL_DEPARTURE_ROUNDS - 1, effects: [effect(DEAD)] });
    later.deathRound = 3;
    expect(later.soulRoundsLeft()).toBe(1);
  });

  it('refuses to revive the living, a departed soul and hits beyond the death threshold', () => {
    expect(() => load().checkRevivable()).toThrow(expect.objectContaining({ code: 'err-revive-not-dead' }));
    const departed = load({ round: 1 + SOUL_DEPARTURE_ROUNDS, effects: [effect(DEAD)] });
    departed.deathRound = 1;
    expect(() => departed.checkRevivable()).toThrow(expect.objectContaining({ code: 'err-revive-soul-departed' }));
    const beyond = load({ hp: [50, -60, 50] });
    addEffect(beyond, DEAD);
    expect(() => beyond.checkRevivable()).toThrow(expect.objectContaining({ code: 'err-revive-beyond-death-threshold' }));
  });

  it('a revived body is unconscious, no longer dead', () => {
    const round = load({ hp: [50, -10, 50] });
    addEffect(round, DEAD);
    round.revive(SOURCE);
    expect(round.effects.map(each => each.status)).toContain(UNCONSCIOUS);
    expect(round.isDead()).toBe(false);
    expect(round.deathRound).toBeNull();
  });
});

describe('AmputateLimbHandler and ReviveActorHandler', () => {
  const setup = (result: string, patient: ActorRound) => {
    Object.assign(patient, { id: 'patient-round', actorId: 'patient', gameId: 'game-1' });
    const update = vi.fn((updated: ActorRound) => Promise.resolve(updated));
    const actorRoundRepository = {
      findById: vi.fn(() => Promise.resolve(patient)),
      update,
    } as unknown as ActorRoundRepository;
    const gameRepository = {
      findById: vi.fn(() => Promise.resolve({ id: 'game-1', name: 'Moria', round: 2, checkNotFinished: () => undefined })),
    } as unknown as GameRepository;
    const characterClient = { findById: vi.fn() } as unknown as CharacterPort;
    const absolute = vi.fn((total: number, table?: string) => Promise.resolve({ result, message: `${table} ${total}`, effects: [] }));
    const service = new MedicalRollService(actorRoundRepository, gameRepository, sheetsOf(characterClient), {
      absolute,
    } as unknown as ManeuverPort);
    return {
      absolute,
      amputate: new AmputateLimbHandler(actorRoundRepository, service),
      revive: new ReviveActorHandler(actorRoundRepository, service),
    };
  };
  const healer = { healer: { name: 'Surgeon', bonus: 50 } };

  it('an emergency amputation at -30 against the medical table; an absolute failure is 2d10 rounds of dying', async () => {
    const { amputate, absolute } = setup('absolute-failure', load());
    const result = await amputate.execute(
      new AmputateLimbCommand('patient-round', 'leg', 'left', undefined, healer, 40, undefined, 7, 'user', []),
    );
    expect(absolute).toHaveBeenCalledWith(40 + 50 - 30, 'medical');
    expect(result.roll.breakdown.find(each => each.key === 'difficulty')).toMatchObject({ value: -30, rule: '§13.1' });
    expect(result).toMatchObject({ lostLimb: { location: 'leg', side: 'left', cause: 'amputation' }, dyingRounds: 7 });
    expect(result.injuryIds).toHaveLength(4);
    expect(result.criticalAlertId).toBeUndefined();
  });

  it('a failed amputation leaves the critical alert of the stump', async () => {
    const { amputate } = setup('failure', load());
    const result = await amputate.execute(
      new AmputateLimbCommand('patient-round', 'arm', 'right', undefined, healer, 40, undefined, undefined, 'user', []),
    );
    expect(result.criticalAlertId).toEqual(expect.any(String));
    expect(result.dyingRounds).toBeUndefined();
  });

  it('a cardiac revival at -100: a success turns dead into unconscious', async () => {
    const patient = load({ hp: [50, -5, 50] });
    addEffect(patient, DEAD);
    const { revive, absolute } = setup('success', patient);
    const result = await revive.execute(
      new ReviveActorCommand('patient-round', 'cardiac', healer, 90, undefined, false, undefined, 'user', []),
    );
    expect(absolute).toHaveBeenCalledWith(90 + 50 - 100, 'medical');
    expect(result.revived).toBe(true);
    expect(patient.isDead()).toBe(false);
    expect(result.shock).toBeUndefined();
  });

  it('a dangerous defibrillation that fails: still dead, an L critical alert and its hits', async () => {
    const patient = load({ hp: [50, -5, 50] });
    addEffect(patient, DEAD);
    const { revive } = setup('failure', patient);
    const result = await revive.execute(new ReviveActorCommand('patient-round', 'defibrillation', healer, 40, -45, true, 12, 'user', []));
    expect(result.revived).toBe(false);
    expect(result.shock).toMatchObject({ criticalSeverity: 'C', hitsDice: 3, hits: 12 });
    expect(patient.hp.current).toBe(-17);
    expect(patient.alerts.find(alert => alert.id === result.shock!.alertId)!.getModifierText('criticalType')).toBe('L');
  });

  it('refuses a body that is not dead before rolling', async () => {
    const { revive, absolute } = setup('success', load());
    await expect(
      revive.execute(new ReviveActorCommand('patient-round', 'respiratory', healer, 90, undefined, false, undefined, 'user', [])),
    ).rejects.toMatchObject({ code: 'err-revive-not-dead' });
    expect(absolute).not.toHaveBeenCalled();
  });
});
