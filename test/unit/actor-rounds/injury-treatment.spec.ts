import { describe, expect, it, vi } from 'vitest';
import type { CriticalTableLookupRequest, CriticalTablePort } from '../../../src/modules/actions/application/ports/critical-table.port.js';
import type { ManeuverPort } from '../../../src/modules/actions/application/ports/maneuver.port.js';
import { type CriticalEffect, CriticalResult } from '../../../src/modules/actions/domain/value-objects/critical-result.vo.js';
import type { HealingTablesPort } from '../../../src/modules/actor-rounds/application/ports/healing-tables.port.js';
import type {
  TreatmentDifficultyRow,
  TreatmentTables,
} from '../../../src/modules/actor-rounds/domain/value-objects/treatment-difficulty.vo.js';
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
import { sheetsOf } from '../support/actor-sheets.js';

const wound = (bleeding: number, overrides: Partial<Injury> = {}): Injury => ({
  ...buildInjury({ id: 'wound', type: 'cut-burn', location: 'arm', penalty: -10, bleeding, source: { kind: 'critical' } }),
  ...overrides,
});

const outcome = (result: MedicalResult, injuryPenalty = 0): MedicalOutcome => ({ result, recoveryModifier: 0, injuryPenalty });

/** Made-up treatment tables in the shape core serves them (workspace spec 022). */
const row = (procedure: string, injuryType: string, severity: string, difficulty: string): TreatmentDifficultyRow => ({
  procedure,
  injuryType,
  severity,
  difficulty,
});
const TABLES: TreatmentTables = {
  difficulties: [
    row('pressure', 'cut-burn', 'light', 'e'),
    row('pressure', 'unknown', 'light', 'e'),
    row('cauterize', 'cut-burn', 'light', 'r'),
    row('cauterize', 'cut-burn', 'medium', 'r'),
    row('dress', 'skin-tissue', 'light', 'r'),
    row('dress', 'cut-burn', 'light', 'e'),
    row('dress', 'organ', 'light', 'vh'),
    row('dress', 'bone', 'medium', 'h'),
  ],
  rules: { headDifficultySteps: 1, cauterizePenaltyPerBleeding: -5 },
};

describe('InjuryTreatmentRules (spec 013, §3 and workspace spec 022)', () => {
  it('direct pressure stops a light bleeding and slows a serious one by 4, only on a success (D5)', () => {
    const light = wound(3);
    const serious = wound(6);
    const partial = wound(3);
    InjuryTreatmentRules.apply('pressure', light, outcome('success'));
    InjuryTreatmentRules.apply('pressure', serious, outcome('absolute-success'));
    InjuryTreatmentRules.apply('pressure', partial, outcome('partial-success'));
    expect([light.bleeding, light.bleedingControl]).toEqual([0, 'pressure']);
    expect([serious.bleeding, serious.bleedingControl]).toEqual([2, 'pressure']);
    expect([partial.bleeding, partial.bleedingControl]).toEqual([3, undefined]);
  });

  it('a partial success is not a medicine success (D5)', () => {
    expect(InjuryTreatmentRules.isSuccess('partial-success')).toBe(false);
    expect(InjuryTreatmentRules.apply('dress', wound(0), outcome('partial-success')).healingType).toBe('none');
  });

  it('stitches stop the bleeding and halve the penalty toward zero, the initial one too (D2)', () => {
    const stitched = wound(5, { penalty: -15, initialPenalty: -15 });
    InjuryTreatmentRules.apply('stitches', stitched, outcome('success'));
    expect([stitched.bleeding, stitched.bleedingControl, stitched.penalty, stitched.initialPenalty]).toEqual([0, 'stitches', -7, -7]);
  });

  it('stitches only close light and medium wounds (D2)', () => {
    expect(() => InjuryTreatmentRules.validate('stitches', wound(8, { severity: 'severe' }))).toThrow(
      expect.objectContaining({ code: 'err-treatment-invalid-severity', statusCode: 400 }),
    );
    expect(() => InjuryTreatmentRules.validate('stitches', wound(5, { severity: 'medium' }))).not.toThrow();
  });

  it('tourniquet and magic stop the bleeding; a failure does nothing', () => {
    const tourniquet = wound(5);
    const magic = wound(5);
    const failed = wound(5);
    InjuryTreatmentRules.apply('tourniquet', tourniquet, outcome('absolute-success'));
    InjuryTreatmentRules.apply('magic', magic, outcome('failure'));
    InjuryTreatmentRules.apply('stitches', failed, outcome('failure'));
    expect([tourniquet.bleeding, tourniquet.bleedingControl]).toEqual([0, 'tourniquet']);
    expect([magic.bleeding, magic.bleedingControl]).toEqual([0, 'magic']);
    expect([failed.bleeding, failed.bleedingControl, failed.penalty]).toEqual([5, undefined, -10]);
  });

  it('an absolute failure makes the penalty and the initial penalty worse, and the severity follows (D1)', () => {
    const injury = wound(2, { penalty: -15, initialPenalty: -15, severity: 'light' });
    InjuryTreatmentRules.apply('stitches', injury, outcome('absolute-failure', 10));
    expect([injury.penalty, injury.initialPenalty, injury.severity, injury.bleeding]).toEqual([-25, -25, 'medium', 2]);
    const byDefault = wound(0, { penalty: -35, initialPenalty: -35, severity: 'medium' });
    InjuryTreatmentRules.apply('dress', byDefault, outcome('absolute-failure'));
    expect([byDefault.penalty, byDefault.initialPenalty, byDefault.severity]).toEqual([-45, -45, 'severe']);
  });

  it('cauterizing follows Table 13-1c: bleeding, heat critical, d10 of extra hits and no recovery modifier (D7)', () => {
    const results: MedicalResult[] = ['absolute-failure', 'failure', 'partial-success', 'success', 'absolute-success'];
    const rows = results.map(result => {
      const injury = wound(5);
      const effect = InjuryTreatmentRules.apply('cauterize', injury, { result, recoveryModifier: -25, injuryPenalty: 10 });
      return [
        result,
        injury.bleeding,
        injury.penalty,
        effect.heatCritical,
        effect.heatHitsDice,
        effect.recoveryModifier,
        effect.healingType,
      ];
    });
    expect(rows).toEqual([
      ['absolute-failure', 5, -10, 'D', 4, 0, 'none'],
      ['failure', 2, -10, 'C', 3, 0, 'none'],
      ['partial-success', 0, -10, 'B', 2, 0, 'none'],
      ['success', 0, -10, 'A', 1, 0, 'medicine'],
      ['absolute-success', 0, -10, undefined, undefined, 0, 'medicine-absolute'],
    ]);
  });

  it('an unmodified 66 on a cauterization is an unusual event', () => {
    expect(InjuryTreatmentRules.apply('cauterize', wound(5), outcome('success'), 66).unusualEvent).toBe(true);
    expect(InjuryTreatmentRules.apply('cauterize', wound(5), outcome('success'), 65).unusualEvent).toBeUndefined();
  });

  it('takes the difficulty of the procedure without a table, one step harder on the head and by the bleeding when cauterizing', () => {
    expect(InjuryTreatmentRules.defaultDifficulty('pressure', wound(2))).toBe(20);
    expect(InjuryTreatmentRules.defaultDifficulty('pressure', wound(2, { location: 'head' }))).toBe(10);
    expect(InjuryTreatmentRules.defaultDifficulty('stitches', wound(2))).toBe(0);
    expect(InjuryTreatmentRules.defaultDifficulty('tourniquet', wound(2))).toBe(-20);
    expect(InjuryTreatmentRules.defaultDifficulty('cauterize', wound(4))).toBe(10);
  });

  it('takes the difficulty of core by procedure, injury type and severity, with its rules (D4)', () => {
    expect(InjuryTreatmentRules.defaultDifficulty('dress', wound(0, { type: 'skin-tissue' }), TABLES)).toBe(30);
    expect(InjuryTreatmentRules.defaultDifficulty('dress', wound(0, { type: 'cut-burn' }), TABLES)).toBe(20);
    expect(InjuryTreatmentRules.defaultDifficulty('dress', wound(0, { type: 'organ' }), TABLES)).toBe(-20);
    expect(InjuryTreatmentRules.defaultDifficulty('dress', wound(0, { type: 'organ', location: 'head' }), TABLES)).toBe(-30);
    expect(InjuryTreatmentRules.defaultDifficulty('dress', wound(0, { type: 'bone', severity: 'medium' }), TABLES)).toBe(-10);
    expect(InjuryTreatmentRules.defaultDifficulty('cauterize', wound(4), TABLES)).toBe(10);
    const twoSteps = { ...TABLES, rules: { headDifficultySteps: 2, cauterizePenaltyPerBleeding: -10 } };
    expect(InjuryTreatmentRules.defaultDifficulty('cauterize', wound(2, { location: 'head' }), twoSteps)).toBe(-10);
    expect(InjuryTreatmentRules.defaultDifficulty('magic', wound(4), TABLES)).toBe(0);
  });

  it('refuses a procedure core has no row for, and an unknown type when the rows do not agree (D4)', () => {
    expect(() => InjuryTreatmentRules.defaultDifficulty('dress', wound(0, { type: 'organ', severity: 'severe' }), TABLES)).toThrow(
      expect.objectContaining({ code: 'err-treatment-not-applicable' }),
    );
    expect(() => InjuryTreatmentRules.defaultDifficulty('dress', wound(0, { type: 'unknown' }), TABLES)).toThrow(
      expect.objectContaining({ code: 'err-injury-type-required' }),
    );
    expect(InjuryTreatmentRules.defaultDifficulty('pressure', wound(2, { type: 'unknown' }), TABLES)).toBe(20);
    const agreeing = { ...TABLES, difficulties: [row('cauterize', 'organ', 'light', 'r'), row('cauterize', 'bone', 'light', 'r')] };
    expect(InjuryTreatmentRules.defaultDifficulty('cauterize', wound(0, { type: 'unknown' }), agreeing)).toBe(30);
    const invalid = { ...TABLES, difficulties: [row('pressure', 'cut-burn', 'light', 'x')] };
    expect(() => InjuryTreatmentRules.defaultDifficulty('pressure', wound(2), invalid)).toThrow(
      expect.objectContaining({ code: 'err-treatment-invalid-difficulty' }),
    );
  });

  it('puts a tourniquet only on a limb', () => {
    expect(() => InjuryTreatmentRules.validate('tourniquet', wound(4, { location: 'chest' }))).toThrow(
      expect.objectContaining({ code: 'err-treatment-invalid-location' }),
    );
  });

  it('gains 1 round on a success and 2 on an absolute success when stabilizing', () => {
    expect(InjuryTreatmentRules.stabilizationRounds('partial-success')).toBe(0);
    expect(InjuryTreatmentRules.stabilizationRounds('success')).toBe(1);
    expect(InjuryTreatmentRules.stabilizationRounds('absolute-success')).toBe(2);
  });
});

describe('TreatInjuryHandler and StabilizeEffectHandler', () => {
  const setup = (result: string, effects: { status: string; value: number }[] = [], tables: TreatmentTables | null = null) => {
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
    const update = vi.fn((updated: ActorRound) => Promise.resolve(updated));
    const actorRoundRepository = {
      findById: vi.fn(() => Promise.resolve(patient)),
      findByActorIdAndRound: vi.fn(() => Promise.resolve(healer)),
      update,
    } as unknown as ActorRoundRepository;
    const gameRepository = {
      findById: vi.fn(() => Promise.resolve({ id: 'game-1', name: 'Moria', round: 2, checkNotFinished: () => undefined })),
    } as unknown as GameRepository;
    const characterClient = {
      findById: vi.fn(() => Promise.resolve({ skills: [{ skillId: 'medicine', specialization: null, totalBonus: 45 }] })),
    } as unknown as CharacterPort;
    const absolute = vi.fn((total: number, table?: string) => Promise.resolve({ result, message: `${table} ${total}`, effects }));
    const maneuverPort = { absolute } as unknown as ManeuverPort;
    const service = new MedicalRollService(actorRoundRepository, gameRepository, sheetsOf(characterClient), maneuverPort);
    const healingTables: HealingTablesPort = { treatmentTables: vi.fn(() => Promise.resolve(tables)) };
    const lookup = vi.fn((request: CriticalTableLookupRequest) =>
      Promise.resolve(
        new CriticalResult(`Burn ${request.criticalSeverity}`, 4, 'arm', [
          { status: 'stunned', value: -25, rounds: 1 } as CriticalEffect,
          { status: 'penalty', value: -10 } as CriticalEffect,
        ]),
      ),
    );
    const criticalTable: CriticalTablePort = { lookup };
    return {
      patient,
      absolute,
      lookup,
      healingTables,
      treat: new TreatInjuryHandler(actorRoundRepository, service, healingTables, criticalTable),
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

  it('spec 052: returns the breakdown of the total, each entry with its group and rule', async () => {
    const { treat } = setup('success', []);

    const result = await treat.execute(
      new TreatInjuryCommand('patient-round', 'wound', 'stitches', { healerActorId: 'healer' }, 60, undefined, 'user', []),
    );

    expect(result.roll.breakdown.map(({ key, value }) => [key, value])).toEqual([
      ['roll', 60],
      ['medicine', 45],
      ['difficulty', 0],
      ['healer-penalty', -10],
    ]);
    expect(result.roll.breakdown[1]).toMatchObject({ group: 'skill', rule: 'Table 3-15', params: { healer: 'Elrond' } });
    expect(result.roll.breakdown[2]).toMatchObject({
      group: 'situation',
      params: { procedure: 'procedure-stitches', injuryType: 'injury-type-cut-burn' },
    });
    expect(result.roll.breakdown[3]).toMatchObject({ group: 'penalty', source: 'healer' });
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

  it('takes the difficulty of core when the request has none (D4)', async () => {
    const { treat, absolute } = setup('success', [], {
      difficulties: [row('pressure', 'cut-burn', 'medium', 'l')],
      rules: TABLES.rules,
    });

    const result = await treat.execute(
      new TreatInjuryCommand('patient-round', 'wound', 'pressure', { healer: { name: 'Ioreth', bonus: 30 } }, 50, undefined, 'u', []),
    );

    expect(result.roll.difficulty).toBe(10);
    expect(absolute).toHaveBeenCalledWith(90, 'medical');
  });

  it('cauterizing without the critical roll burns the patient and leaves the heat critical as an alert on the location (D7)', async () => {
    const { treat, patient, lookup } = setup('failure', [{ status: 'recoveryRollModifier', value: -100 }]);
    const hp = patient.hp.current;

    const result = await treat.execute(
      new TreatInjuryCommand('patient-round', 'wound', 'cauterize', { healer: { name: 'Ioreth', bonus: 30 } }, 40, 0, 'u', [], {
        heatHitsRoll: 17,
      }),
    );

    expect(lookup).not.toHaveBeenCalled();
    expect(result.heat).toEqual(expect.objectContaining({ critical: 'C', hitsDice: 3, hits: 17 }));
    expect(patient.hp.current).toBe(hp - 17);
    expect(result.treatment.recoveryModifier).toBe(0);
    const alert = patient.alerts.find(each => each.id === result.heat!.alertId)!;
    expect(alert.modifiers?.map(m => [m.key, m.modifier])).toEqual([
      ['criticalType', 'H'],
      ['criticalSeverity', 'C'],
      ['location', 'arms'],
    ]);
    expect(patient.hpLog.map(entry => [entry.kind, entry.amount, entry.injuryId])).toEqual([['treatment', -17, 'wound']]);
  });

  it('cauterizing with the critical roll resolves the heat critical on the location of the injury (D7)', async () => {
    const { treat, patient, lookup } = setup('success');
    const hp = patient.hp.current;

    const result = await treat.execute(
      new TreatInjuryCommand('patient-round', 'wound', 'cauterize', { healer: { name: 'Ioreth', bonus: 30 } }, 90, 0, 'u', [], {
        heatHitsRoll: 6,
        heatCriticalRoll: 55,
      }),
    );

    expect(lookup).toHaveBeenCalledWith({ criticalType: 'H', criticalSeverity: 'A', roll: 55, location: 'arms' });
    expect(result.heat).toEqual(expect.objectContaining({ critical: 'A', hits: 6, criticalRoll: 55, criticalDamage: 4 }));
    expect(patient.hp.current).toBe(hp - 10);
    expect(patient.effects.map(e => [e.status, e.source?.criticalKey])).toEqual(expect.arrayContaining([['stunned', 'H-A-55']]));
    expect(patient.injuries.find(i => i.source.criticalKey === 'H-A-55')).toEqual(
      expect.objectContaining({ type: 'cut-burn', penalty: -10, location: 'arm' }),
    );
    expect(patient.injuries[0].bleeding).toBe(0);
  });

  it('rolls the extra hits when the client does not, and refuses impossible ones (D7)', async () => {
    const { treat } = setup('partial-success');
    const healer = { healer: { name: 'Ioreth', bonus: 30 } };

    const rolled = await treat.execute(new TreatInjuryCommand('patient-round', 'wound', 'cauterize', healer, 50, 0, 'u', []));
    expect(rolled.heat!.hits).toBeGreaterThanOrEqual(2);
    expect(rolled.heat!.hits).toBeLessThanOrEqual(20);

    await expect(
      treat.execute(new TreatInjuryCommand('patient-round', 'wound', 'cauterize', healer, 50, 0, 'u', [], { heatHitsRoll: 25 })),
    ).rejects.toThrow(expect.objectContaining({ code: 'err-treatment-invalid-roll' }));
    await expect(
      treat.execute(new TreatInjuryCommand('patient-round', 'wound', 'cauterize', healer, 50, 0, 'u', [], { heatCriticalRoll: 101 })),
    ).rejects.toThrow(expect.objectContaining({ code: 'err-treatment-invalid-roll' }));
  });

  it('asks for a healer', async () => {
    const { treat } = setup('success');
    await expect(
      treat.execute(new TreatInjuryCommand('patient-round', 'wound', 'pressure', {}, 50, undefined, 'user', [])),
    ).rejects.toThrow(expect.objectContaining({ code: 'err-healer-required' }));
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
