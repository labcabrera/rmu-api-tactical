import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { ResistanceRollCommand } from '../../../src/modules/psychology/application/cqrs/commands/resistance-roll.command.js';
import { ResistanceRollHandler } from '../../../src/modules/psychology/application/cqrs/handlers/resistance-roll.handler.js';
import type { PsychologyTablesPort } from '../../../src/modules/psychology/application/ports/psychology-tables.port.js';
import { ResistanceRollCalculator } from '../../../src/modules/psychology/domain/services/resistance-roll.calculator.js';
import { ApiPsychologyTablesAdapter } from '../../../src/modules/psychology/infrastructure/api-clients/api.psychology-tables.adapter.js';
import { HttpClient } from '../../../src/modules/shared/infrastructure/http/http-client.js';
import type { TokenService } from '../../../src/modules/shared/infrastructure/security/token.service.js';
import { PSYCHOLOGY_TABLES } from '../../fixtures/psychology-tables.js';
import { load } from '../actor-rounds/actor-round-test.factory.js';

const fear = (roll: number, bonus: number, attackLevel: number, extra: object = {}) =>
  ResistanceRollCalculator.resolve({ kind: 'fear', roll, bonus, attackLevel, ...extra }, PSYCHOLOGY_TABLES);

describe('ResistanceRollCalculator (workspace spec 022, decision 8)', () => {
  it('resists when the roll, the bonus and the modifiers less the attack level reach the required total', () => {
    const result = fear(50, 25, 5, {
      modifiers: [
        { key: 'leader', value: 0 },
        { key: 'custom', value: 5 },
      ],
    });
    expect(result).toMatchObject({ total: 65, required: 60, resisted: true, failure: 0 });
    expect(result.breakdown).toEqual([
      { key: 'roll', value: 50 },
      { key: 'fear-rr', value: 25 },
      { key: 'attack-level', value: -15 },
      { key: 'custom', value: 5 },
    ]);
    expect(result.severity).toBeUndefined();
  });

  it('gives the severity and the fear state of the failure margin', () => {
    expect(fear(30, 10, 5)).toMatchObject({
      total: 25,
      failure: 35,
      result: 'moderate-failure',
      severity: 'moderate',
      fearState: 'retreat',
      rallyModifier: -15,
    });
    expect(fear(59, 0, 0)).toMatchObject({ failure: 1, severity: 'mild', fearState: 'balk' });
    expect(fear(-40, 0, 10)).toMatchObject({ failure: 130, severity: 'extreme', fearState: 'broken', rallyModifier: -90 });
  });

  it('leaves the injury penalties out of a fear RR unless core says otherwise', () => {
    expect(fear(50, 25, 0, { penalty: -30 }).total).toBe(75);
    const counting = { ...PSYCHOLOGY_TABLES, resistanceRoll: { ...PSYCHOLOGY_TABLES.resistanceRoll, fearIgnoresInjuryPenalties: false } };
    expect(ResistanceRollCalculator.resolve({ kind: 'fear', roll: 50, bonus: 25, attackLevel: 0, penalty: -30 }, counting).total).toBe(45);
  });

  it('refuses a roll that is not a number', () => {
    expect(() => fear(Number.NaN, 0, 1)).toThrow(expect.objectContaining({ code: 'err-resistance-roll-invalid' }));
  });
});

describe('ResistanceRollHandler', () => {
  const setup = (resistances: { resistance: string; totalBonus: number }[]) => {
    const actorRound = Object.assign(load({ resistances }), { id: 'round-1', actorId: 'frodo', actorName: 'Frodo' });
    const repository = { findById: vi.fn(() => Promise.resolve(actorRound)) } as unknown as ActorRoundRepository;
    const tables: PsychologyTablesPort = { find: vi.fn(() => Promise.resolve(PSYCHOLOGY_TABLES)) };
    return new ResistanceRollHandler(repository, tables);
  };

  it('takes the fear RR bonus of the sheet, or the one sent', async () => {
    const handler = setup([{ resistance: 'fear', totalBonus: 20 }]);
    const fromSheet = await handler.execute(new ResistanceRollCommand('round-1', 'fear', 2, 40, [], undefined, 'u', []));
    expect([fromSheet.bonus, fromSheet.result.total]).toEqual([20, 54]);
    const sent = await handler.execute(new ResistanceRollCommand('round-1', 'fear', 2, 40, [], 30, 'u', []));
    expect([sent.bonus, sent.result.resisted]).toEqual([30, true]);
  });

  it('asks for a bonus when the actor has none (an NPC)', async () => {
    await expect(setup([]).execute(new ResistanceRollCommand('round-1', 'fear', 2, 40, [], undefined, 'u', []))).rejects.toThrow(
      expect.objectContaining({ code: 'err-resistance-bonus-required' }),
    );
  });

  // Workspace spec 040, decision 14
  it('kills a frenzy-dying actor that fails its physical RR, at attack level 0 and without penalties', async () => {
    const actorRound = Object.assign(
      load({ hp: [50, 5, 20], penalties: [['critical', -30]], resistances: [{ resistance: 'physical', totalBonus: 10 }] }),
      { id: 'round-1', actorId: 'frodo', actorName: 'Frodo' },
    );
    actorRound.enterFrenzy(1);
    actorRound.adjustHp(40);
    actorRound.applyUpkeep();
    expect(actorRound.alerts).toContainEqual(expect.objectContaining({ type: 'frenzy-dying', status: 'pending' }));
    const update = vi.fn((updated: unknown) => Promise.resolve(updated));
    const repository = { findById: vi.fn(() => Promise.resolve(actorRound)), update } as unknown as ActorRoundRepository;
    const handler = new ResistanceRollHandler(repository, { find: vi.fn(() => Promise.resolve(PSYCHOLOGY_TABLES)) });

    const resisted = await handler.execute(new ResistanceRollCommand('round-1', 'physical', 9, 60, [], undefined, 'u', [], 'frenzy-dying'));
    expect(resisted.attackLevel).toBe(0);
    expect(resisted.result).toMatchObject({ total: 70, resisted: true });
    expect(actorRound.isDead()).toBe(false);
    expect(actorRound.alerts.find(alert => alert.type === 'frenzy-dying')?.status).toBe('resolved');

    const failed = await handler.execute(new ResistanceRollCommand('round-1', 'physical', 0, 20, [], undefined, 'u', [], 'frenzy-dying'));
    expect(failed.result.resisted).toBe(false);
    expect(actorRound.isDead()).toBe(true);
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('rejects a frenzy-dying RR that is not physical', async () => {
    const handler = setup([{ resistance: 'fear', totalBonus: 20 }]);
    await expect(
      handler.execute(new ResistanceRollCommand('round-1', 'fear', 0, 40, [], undefined, 'u', [], 'frenzy-dying')),
    ).rejects.toThrow(expect.objectContaining({ code: 'err-resistance-roll-invalid' }));
  });

  it('answers 404 for an unknown actor round', async () => {
    const repository = { findById: vi.fn(() => Promise.resolve(null)) } as unknown as ActorRoundRepository;
    const handler = new ResistanceRollHandler(repository, { find: vi.fn() });
    await expect(handler.execute(new ResistanceRollCommand('x', 'fear', 2, 40, [], 1, 'u', []))).rejects.toThrow(
      expect.objectContaining({ statusCode: 404 }),
    );
  });
});

describe('ApiPsychologyTablesAdapter', () => {
  const tokenService = { getToken: () => Promise.resolve('token') } as unknown as TokenService;
  const configService = { get: () => 'http://core/v1' } as unknown as ConfigService;
  const httpClient = new HttpClient(new ConfigService({}));
  const answer = (status: number, body: unknown) => {
    const fetch = vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
    vi.stubGlobal('fetch', fetch);
    return fetch;
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the tables once', async () => {
    const adapter = new ApiPsychologyTablesAdapter(tokenService, httpClient, configService);
    const fetch = answer(200, PSYCHOLOGY_TABLES);
    expect(await adapter.find()).toEqual(PSYCHOLOGY_TABLES);
    await adapter.find();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]).toEqual(['http://core/v1/psychology-tables', expect.anything()]);
  });

  it('answers 422 when core has not imported them, and passes on other errors', async () => {
    answer(404, { message: 'nope' });
    await expect(new ApiPsychologyTablesAdapter(tokenService, httpClient, configService).find()).rejects.toThrow(
      expect.objectContaining({ code: 'err-psychology-tables-missing', statusCode: 422 }),
    );
    answer(500, { message: 'boom' });
    await expect(new ApiPsychologyTablesAdapter(tokenService, httpClient, configService).find()).rejects.toThrow(
      expect.objectContaining({ statusCode: 502 }),
    );
  });
});
