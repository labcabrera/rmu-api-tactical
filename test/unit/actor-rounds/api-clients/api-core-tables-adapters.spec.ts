import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ApiHealingTablesAdapter } from '../../../../src/modules/actor-rounds/infrastructure/api-clients/api.healing-tables.adapter.js';
import { HttpClient } from '../../../../src/modules/shared/infrastructure/http/http-client.js';
import type { TokenService } from '../../../../src/modules/shared/infrastructure/security/token.service.js';

const BASE_URI = 'http://core/v1';
const tokenService = { getToken: () => Promise.resolve('token') } as unknown as TokenService;
const configService = { get: (key: string) => (key === 'RMU_API_CORE_URI' ? BASE_URI : undefined) } as unknown as ConfigService;
const httpClient = new HttpClient(new ConfigService({}));

const answer = (status: number, body: unknown) => {
  const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ApiHealingTablesAdapter', () => {
  it('reads the treatment difficulties and rules of the healing tables once', async () => {
    const adapter = new ApiHealingTablesAdapter(tokenService, httpClient, configService);
    const rows = [{ procedure: 'dress', injuryType: 'organ', severity: 'light', difficulty: 'vh' }];
    const rules = { headDifficultySteps: 2, cauterizePenaltyPerBleeding: -5, tourniquetLocations: ['arm', 'leg'] };
    const fetch = answer(200, { recoveryDays: [], treatmentDifficulties: rows, treatmentRules: rules });

    expect(await adapter.treatmentTables()).toEqual({ difficulties: rows, rules });
    expect(await adapter.treatmentTables()).toEqual({ difficulties: rows, rules });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe(`${BASE_URI}/healing-tables`);
  });

  it('fills the rules core does not send', async () => {
    const rows = [{ procedure: 'dress', injuryType: 'organ', severity: 'light', difficulty: 'vh' }];
    answer(200, { treatmentDifficulties: rows });
    expect(await new ApiHealingTablesAdapter(tokenService, httpClient, configService).treatmentTables()).toEqual({
      difficulties: rows,
      rules: { headDifficultySteps: 1, cauterizePenaltyPerBleeding: -5 },
    });
  });

  it('reads no table from a core without rows (older import) or without the tables', async () => {
    answer(200, { recoveryDays: [], treatmentDifficulties: [] });
    expect(await new ApiHealingTablesAdapter(tokenService, httpClient, configService).treatmentTables()).toBeNull();
    answer(404, { message: 'not imported' });
    expect(await new ApiHealingTablesAdapter(tokenService, httpClient, configService).treatmentTables()).toBeNull();
  });

  it('fails on any other error of core', async () => {
    answer(500, { message: 'boom' });
    await expect(new ApiHealingTablesAdapter(tokenService, httpClient, configService).treatmentTables()).rejects.toThrow();
  });
});
