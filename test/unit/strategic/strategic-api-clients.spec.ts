import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpClient } from '../../../src/modules/shared/infrastructure/http/http-client.js';
import type { TokenService } from '../../../src/modules/shared/infrastructure/security/token.service.js';
import { CharacterApiClient } from '../../../src/modules/strategic/infrastructure/api-clients/api.character.adapter.js';
import { ItemApiClient } from '../../../src/modules/strategic/infrastructure/api-clients/api.item.adapter.js';
import { StrategicGameApiClient } from '../../../src/modules/strategic/infrastructure/api-clients/api.strategic-game.adapter.js';

const BASE_URI = 'http://rmu-api-strategic:3002/v1';
const tokenService = { getToken: () => Promise.resolve('token') } as unknown as TokenService;
const config = new ConfigService({ RMU_API_STRATEGIC_URI: BASE_URI });
const httpClient = new HttpClient(config);

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

// strategic answers pages: the clients read `content` [F-tactical-20].
describe('strategic API clients', () => {
  it('reads the characters of a game from the page content', async () => {
    const fetch = answer(200, { content: [{ id: 'c-1' }], pagination: { page: 0, size: 1000, totalElements: 1 } });

    const characters = await new CharacterApiClient(tokenService, httpClient, config).findByGameId('sg 1');

    expect(characters).toEqual([{ id: 'c-1' }]);
    expect(fetch.mock.calls[0][0]).toBe(`${BASE_URI}/characters?q=gameId==sg%201&page=0&size=1000`);
  });

  it('reads the items of a character from the page content', async () => {
    const fetch = answer(200, { content: [{ id: 'i-1' }] });

    expect(await new ItemApiClient(tokenService, httpClient, config).findByCharacterId('c-1')).toEqual([{ id: 'i-1' }]);
    expect(fetch.mock.calls[0][0]).toBe(`${BASE_URI}/items?q=characterId==c-1&page=0&size=1000`);
  });

  it('answers undefined and null to a character and a game that strategic does not find', async () => {
    answer(404, { message: 'not found' });

    expect(await new CharacterApiClient(tokenService, httpClient, config).findById('c-1')).toBeUndefined();
    expect(await new StrategicGameApiClient(tokenService, httpClient, config).findById('sg-1')).toBeNull();
  });
});
