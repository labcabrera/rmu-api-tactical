import { describe, expect, it, vi } from 'vitest';
import type { ManeuverPort } from '../../../src/modules/actions/application/ports/maneuver.port.js';
import { StabilizeEffectCommand } from '../../../src/modules/actor-rounds/application/cqrs/commands/stabilize-effect.command.js';
import { TreatInjuryCommand } from '../../../src/modules/actor-rounds/application/cqrs/commands/treat-injury.command.js';
import { StabilizeEffectHandler } from '../../../src/modules/actor-rounds/application/cqrs/handlers/stabilize-effect.handler.js';
import { TreatInjuryHandler } from '../../../src/modules/actor-rounds/application/cqrs/handlers/treat-injury.handler.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { MedicalRollService } from '../../../src/modules/actor-rounds/application/services/medical-roll.service.js';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { InjuryTreatmentRules, type MedicalOutcome } from '../../../src/modules/actor-rounds/domain/services/injury-treatment.js';
import { buildInjury, type Injury, type MedicalResult } from '../../../src/modules/actor-rounds/domain/value-objects/injury.vo.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import type { CharacterPort } from '../../../src/modules/strategic/application/ports/character.port.js';
import { effect, load } from './actor-round-test.factory.js';

const wound = (bleeding: number, overrides: Partial<Injury> = {}): Injury => ({
  ...buildInjury({ id: 'wound', type: 'cut-burn', location: 'arm', penalty: -10, bleeding, source: { kind: 'critical' } }),
  ...overrides,
});

const outcome = (result: MedicalResult, injuryPenalty = 0): MedicalOutcome => ({ result, recoveryModifier: 0, injuryPenalty });

describe('InjuryTreatmentRules (spec 013, §3)', () => {
  it('direct pressure stops a light bleeding and slows a serious one by 4', () => {
    const light = wound(3);
    const serious = wound(6);
    InjuryTreatmentRules.apply('pressure', light, outcome('success'));
    InjuryTreatmentRules.apply('pressure', serious, outcome('partial-success'));
    expect([light.bleeding, light.bleedingControl]).toEqual([0, 'pressure']);
    expect([serious.bleeding, serious.bleedingControl]).toEqual([2, 'pressure']);
  });

  it('stitches, tourniquet and magic stop the bleeding; a failure does nothing', () => {
    const stitched = wound(5);
    const tourniquet = wound(5);
    const magic = wound(5);
    const failed = wound(5);
    InjuryTreatmentRules.apply('stitches', stitched, outcome('success'));
    InjuryTreatmentRules.apply('tourniquet', tourniquet, outcome('absolute-success'));
    InjuryTreatmentRules.apply('magic', magic, outcome('failure'));
    InjuryTreatmentRules.apply('stitches', failed, outcome('failure'));
    expect([stitched.bleeding, stitched.bleedingControl]).toEqual([0, 'stitches']);
    expect([tourniquet.bleeding, tourniquet.bleedingControl]).toEqual([0, 'tourniquet']);
    expect([magic.bleeding, magic.bleedingControl]).toEqual([0, 'magic']);
    expect([failed.bleeding, failed.bleedingControl, failed.penalty]).toEqual([5, undefined, -10]);
  });

  it('an absolute failure makes the penalty worse by 10', () => {
    const injury = wound(2);
    InjuryTreatmentRules.apply('stitches', injury, outcome('absolute-failure', 10));
    expect(injury.penalty).toBe(-20);
    expect(injury.bleeding).toBe(2);
  });

  it('cauterizing stops or halves the bleeding and leaves a heat critical', () => {
    const halved = wound(5);
    const stopped = wound(5);
    const clean = wound(5);
    expect(InjuryTreatmentRules.apply('cauterize', halved, outcome('failure')).heatCritical).toBe('C');
    expect(InjuryTreatmentRules.apply('cauterize', stopped, outcome('success')).heatCritical).toBe('A');
    expect(InjuryTreatmentRules.apply('cauterize', clean, outcome('absolute-success')).heatCritical).toBeUndefined();
    expect([halved.bleeding, halved.bleedingControl]).toEqual([2, 'cauterized']);
    expect(stopped.bleeding).toBe(0);
  });

  it('takes the difficulty of the procedure, one step harder on the head and by the bleeding when cauterizing', () => {
    expect(InjuryTreatmentRules.defaultDifficulty('pressure', wound(2))).toBe(20);
    expect(InjuryTreatmentRules.defaultDifficulty('pressure', wound(2, { location: 'head' }))).toBe(10);
    expect(InjuryTreatmentRules.defaultDifficulty('stitches', wound(2))).toBe(0);
    expect(InjuryTreatmentRules.defaultDifficulty('tourniquet', wound(2))).toBe(-20);
    expect(InjuryTreatmentRules.defaultDifficulty('cauterize', wound(4))).toBe(10);
  });

  it('puts a tourniquet only on a limb', () => {
    expect(() => InjuryTreatmentRules.validate('tourniquet', wound(4, { location: 'chest' }))).toThrow(
      expect.objectContaining({ errorCode: 'err-treatment-invalid-location' }),
    );
  });

  it('gains 1 round on a success and 2 on an absolute success when stabilizing', () => {
    expect(InjuryTreatmentRules.stabilizationRounds('partial-success')).toBe(0);
    expect(InjuryTreatmentRules.stabilizationRounds('success')).toBe(1);
    expect(InjuryTreatmentRules.stabilizationRounds('absolute-success')).toBe(2);
  });
});

describe('TreatInjuryHandler and StabilizeEffectHandler', () => {
  const setup = (result: string, effects: { status: string; value: number }[] = []) => {
    const patient = Object.assign(load({ injuries: [wound(5)], effects: [effect('dying', undefined, 2)] }), {
      id: 'patient-round',
      actorId: 'patient',
      gameId: 'game-1',
    });
    const healer = Object.assign(load({ injuries: [wound(0, { id: 'healer-wound' })] }), {
      id: 'healer-round',
      actorId: 'healer',
      actorName: 'Elrond',
      gameId: 'game-1',
    });
    const update = vi.fn((_id: string, updated: ActorRound) => Promise.resolve(updated));
    const actorRoundRepository = {
      findById: vi.fn(() => Promise.resolve(patient)),
      findByActorIdAndRound: vi.fn(() => Promise.resolve(healer)),
      update,
    } as unknown as ActorRoundRepository;
    const gameRepository = {
      findById: vi.fn(() => Promise.resolve({ id: 'game-1', name: 'Moria', checkNotFinished: () => undefined })),
    } as unknown as GameRepository;
    const characterClient = {
      findById: vi.fn(() => Promise.resolve({ skills: [{ skillId: 'medicine', specialization: null, totalBonus: 45 }] })),
    } as unknown as CharacterPort;
    const absolute = vi.fn((total: number, table?: string) => Promise.resolve({ result, message: `${table} ${total}`, effects }));
    const maneuverPort = { absolute } as unknown as ManeuverPort;
    const service = new MedicalRollService(actorRoundRepository, gameRepository, characterClient, maneuverPort);
    return {
      patient,
      absolute,
      treat: new TreatInjuryHandler(actorRoundRepository, service),
      stabilize: new StabilizeEffectHandler(actorRoundRepository, service),
    };
  };

  it('rolls the Medicine of a healer actor with its penalties against the medical table, and keeps the treatment', async () => {
    const { treat, absolute, patient } = setup('success', []);

    const result = await treat.execute(
      new TreatInjuryCommand('patient-round', 'wound', 'stitches', { healerActorId: 'healer' }, 60, undefined, 'user', []),
    );

    expect(absolute).toHaveBeenCalledWith(60 + 45 + 0 - 10, 'medical');
    expect(result.roll.total).toBe(95);
    expect(patient.injuries[0].bleeding).toBe(0);
    expect(patient.injuries[0].treatments).toEqual([
      expect.objectContaining({
        procedure: 'stitches',
        result: 'success',
        healingType: 'medicine',
        context: 'tactical',
        tacticalGameId: 'game-1',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- nested asymmetric matcher (typed any)
        healer: expect.objectContaining({ actorId: 'healer', name: 'Elrond', bonus: 45 }),
        difficulty: 0,
        roll: 60,
        total: 95,
      }),
    ]);
  });

  it('takes an external healer and the recovery modifier of the result', async () => {
    const { treat, absolute, patient } = setup('absolute-success', [{ status: 'recoveryRollModifier', value: 25 }]);

    await treat.execute(
      new TreatInjuryCommand('patient-round', 'wound', 'dress', { healer: { name: 'Ioreth', bonus: 30 } }, 90, -5, 'user', []),
    );

    expect(absolute).toHaveBeenCalledWith(115, 'medical');
    expect(patient.injuries[0].treatments[0]).toEqual(
      expect.objectContaining({
        healer: { name: 'Ioreth', external: true, bonus: 30 },
        recoveryModifier: 25,
        healingType: 'medicine-absolute',
      }),
    );
  });

  it('asks for a healer', async () => {
    const { treat } = setup('success');
    await expect(
      treat.execute(new TreatInjuryCommand('patient-round', 'wound', 'pressure', {}, 50, undefined, 'user', [])),
    ).rejects.toThrow(expect.objectContaining({ errorCode: 'err-healer-required' }));
  });

  it('gives a dying actor 2 more rounds on an absolute success', async () => {
    const { stabilize, patient } = setup('absolute-success');
    const dying = patient.effects.find(e => e.status === 'dying')!;

    const result = await stabilize.execute(
      new StabilizeEffectCommand('patient-round', dying.id, { healerActorId: 'healer' }, 150, undefined, 'u', []),
    );

    expect(result.roundsGained).toBe(2);
    expect(dying.rounds).toBe(4);
  });
});
