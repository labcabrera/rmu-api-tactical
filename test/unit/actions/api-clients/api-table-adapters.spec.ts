import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../../../../src/modules/shared/infrastructure/http/http-client.js';
import type { TokenService } from '../../../../src/modules/shared/infrastructure/security/token.service.js';
import { ApiAttackTableAdapter } from '../../../../src/modules/actions/infrastructure/api-clients/api.attack-table.adapter.js';
import { ApiCriticalTableAdapter } from '../../../../src/modules/actions/infrastructure/api-clients/api.critical-table.adapter.js';
import { ApiFumbleTableAdapter } from '../../../../src/modules/actions/infrastructure/api-clients/api.fumble-table.adapter.js';
import { ValidationError } from '../../../../src/modules/shared/domain/errors/errors.js';

const BASE_URI = 'http://attack-tables/v1';
const tokenService = { getToken: () => Promise.resolve('token') } as unknown as TokenService;
const configService = { get: (key: string) => (key === 'RMU_API_ATTACK_TABLES_URI' ? BASE_URI : undefined) } as unknown as ConfigService;

const httpClient = new HttpClient(new ConfigService({}));
// Stubs the global fetch that HttpClient uses with one answer.
const answer = (status: number, body: unknown) => {
  const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
};
const mockGet = (data: unknown) => answer(200, data);
const authorization: unknown = expect.objectContaining({ Authorization: 'Bearer token' });
const withToken: unknown = expect.objectContaining({ method: 'GET', headers: authorization });
const requestedUri = (spy: ReturnType<typeof mockGet>) => spy.mock.calls[0][0];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ApiAttackTableAdapter', () => {
  const adapter = new ApiAttackTableAdapter(tokenService, httpClient, configService);
  const request = { attackTable: 'arming-sword', location: undefined };

  it('looks up the table without attack size, with the token, and maps the entry', async () => {
    const get = mockGet({ text: '12CS', damage: 12, criticalType: 'S', criticalSeverity: 'C' });

    const entry = await adapter.lookup({ ...request, roll: 98, armor: 4 });

    expect(requestedUri(get)).toBe(`${BASE_URI}/attack-tables/arming-sword/4/98`);
    expect(get.mock.calls[0][1]).toEqual(withToken);
    expect(entry).toEqual({ text: '12CS', damage: 12, criticalType: 'S', criticalSeverity: 'C' });
  });

  it.each([
    [-40, 0, '1/1'],
    [260, 14, '10/175'],
    [120.6, undefined, '1/120'],
  ])('clamps roll %p and armour %p to the table range', async (roll, armor, path) => {
    const get = mockGet({ text: '0', damage: 0, criticalType: null, criticalSeverity: null });

    const entry = await adapter.lookup({ ...request, roll, armor });

    expect(requestedUri(get)).toBe(`${BASE_URI}/attack-tables/arming-sword/${path}`);
    expect(entry).toEqual({ text: '0', damage: 0, criticalType: undefined, criticalSeverity: undefined });
  });

  it('turns a 400 of the tables into a validation error', async () => {
    answer(400, { error: 'Invalid roll' });

    await expect(adapter.lookup({ ...request, roll: 50, armor: 1 })).rejects.toThrow(ValidationError);
  });
});

describe('ApiCriticalTableAdapter', () => {
  const adapter = new ApiCriticalTableAdapter(tokenService, httpClient, configService);
  const tableEntry = {
    rollMin: 46,
    rollMax: 50,
    dmg: 6,
    location: 'leg',
    message: 'Foe staggers.',
    effects: [{ status: 'bleeding', value: 2 }],
  };

  it('maps message/dmg to text/damage and passes the location in the table naming', async () => {
    const get = mockGet(tableEntry);

    const result = await adapter.lookup({ criticalType: 'S', criticalSeverity: 'C', roll: 48, location: 'legs' });

    expect(requestedUri(get)).toBe(`${BASE_URI}/critical-tables/S/C/48?location=leg`);
    expect(result).toEqual({
      text: 'Foe staggers.',
      damage: 6,
      location: 'leg',
      effects: [{ status: 'bleeding', value: 2, rounds: undefined, delay: undefined, condition: undefined }],
    });
  });

  it('omits the location when it is not known and clamps the roll', async () => {
    const get = mockGet({ ...tableEntry, effects: undefined });

    const result = await adapter.lookup({ criticalType: 'K', criticalSeverity: 'E', roll: 104, location: undefined });

    expect(requestedUri(get)).toBe(`${BASE_URI}/critical-tables/K/E/100`);
    expect(result.effects).toEqual([]);
  });
});

describe('ApiFumbleTableAdapter', () => {
  const adapter = new ApiFumbleTableAdapter(tokenService, httpClient, configService);

  it('reads the fumble table of attack-tables and maps the entry', async () => {
    const get = mockGet({
      rollMin: 31,
      rollMax: 40,
      text: 'Off balance.',
      effects: [{ status: 'initiative_penalty', rounds: 1, value: -5, delay: 1 }],
    });

    const fumble = await adapter.lookup({ fumbleTable: 'melee-one-hand', roll: 35 });

    expect(requestedUri(get)).toBe(`${BASE_URI}/fumble-tables/melee-one-hand/35`);
    expect(fumble).toEqual({
      status: 'completed',
      text: 'Off balance.',
      additionalDamageText: undefined,
      damage: 0,
      effects: [{ status: 'initiative_penalty', rounds: 1, value: -5, delay: 1, condition: undefined }],
    });
  });

  it.each([
    [0, 1],
    [130, 100],
  ])('clamps roll %p to %p', async (roll, clamped) => {
    const get = mockGet({ text: 'Nothing.' });

    const fumble = await adapter.lookup({ fumbleTable: 'bows', roll });

    expect(requestedUri(get)).toBe(`${BASE_URI}/fumble-tables/bows/${clamped}`);
    expect(fumble.effects).toEqual([]);
  });
});
