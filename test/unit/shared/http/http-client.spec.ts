import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BadGatewayError, GatewayTimeoutError, ValidationError } from '../../../../src/modules/shared/domain/errors/errors.js';
import { HttpClient, isUpstreamHttpError } from '../../../../src/modules/shared/infrastructure/http/http-client.js';

const URL = 'http://rmu-api-strategic:3002/v1/strategic-games/g-1?x=1';

const stubFetch = (impl: (url: string, init?: RequestInit) => Promise<Response>) => {
  const fetch = vi.fn(impl);
  vi.stubGlobal('fetch', fetch);
  return fetch;
};

const networkFailure = (code: string) => Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error(code), { code }) });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HttpClient', () => {
  const client = new HttpClient(new ConfigService({}));

  it('sends JSON with the bearer token and the extra headers, and parses the answer', async () => {
    const fetch = stubFetch(() => Promise.resolve(new Response(JSON.stringify({ id: 'g-1' }), { status: 200 })));

    const result = await client.post<{ id: string }>(URL, { name: 'x' }, { token: 't', headers: { 'X-Test': '1' } });

    expect(result).toEqual({ id: 'g-1' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(URL);
    expect(init).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ name: 'x' }),
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer t', 'X-Test': '1' },
    });
  });

  it('sends no body nor token when there are none, and returns undefined on an empty answer', async () => {
    const fetch = stubFetch(() => Promise.resolve(new Response(null, { status: 204 })));

    expect(await client.delete(URL)).toBeUndefined();
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE', headers: { Accept: 'application/json' }, body: undefined });
    expect(fetch.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([400, 422])('turns a %i into a validation error with the upstream message', async status => {
    stubFetch(() => Promise.resolve(new Response(JSON.stringify({ message: ['a', 'b'] }), { status })));

    const error = (await client.get(URL).catch((e: unknown) => e)) as ValidationError & { status: number };

    expect(error).toBeInstanceOf(ValidationError);
    expect(isUpstreamHttpError(error)).toBe(true);
    expect(error.status).toBe(status);
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe(`rmu-api-strategic/v1/strategic-games/g-1 answered ${status}: a, b`);
  });

  it.each([401, 404, 500])('turns a %i into a bad gateway error that keeps the status', async status => {
    stubFetch(() => Promise.resolve(new Response('upstream down', { status, statusText: 'Nope' })));

    const error = (await client.patch(URL, {}).catch((e: unknown) => e)) as BadGatewayError & { status: number };

    expect(error).toBeInstanceOf(BadGatewayError);
    expect(error.status).toBe(status);
    expect(error.statusCode).toBe(502);
    expect(error.message).toBe(`rmu-api-strategic/v1/strategic-games/g-1 answered ${status}: upstream down`);
  });

  it.each(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT'])('reports %s as an unavailable API', async code => {
    stubFetch(() => Promise.reject(networkFailure(code)));

    const error = (await client.put(URL, {}).catch((e: unknown) => e)) as BadGatewayError;

    expect(error).toBeInstanceOf(BadGatewayError);
    expect(isUpstreamHttpError(error)).toBe(false);
    expect(error.message).toBe(`rmu-api-strategic/v1/strategic-games/g-1 is not available (${code})`);
  });

  it('reads the code of a refused connection to every address of the host', async () => {
    const cause = Object.assign(new AggregateError([Object.assign(new Error('x'), { code: 'ECONNREFUSED' })]), {});
    stubFetch(() => Promise.reject(Object.assign(new TypeError('fetch failed'), { cause })));

    await expect(client.get(URL)).rejects.toThrow('is not available (ECONNREFUSED)');
  });

  it('reports any other failure with its message', async () => {
    stubFetch(() => Promise.reject(new TypeError('fetch failed')));

    await expect(client.get(URL)).rejects.toThrow('rmu-api-strategic/v1/strategic-games/g-1 request failed: fetch failed');
  });

  it('reads the timeout from RMU_HTTP_TIMEOUT_MS', async () => {
    const fetch = stubFetch(() => Promise.resolve(new Response(null, { status: 204 })));
    const timeouts = vi.spyOn(AbortSignal, 'timeout');

    await new HttpClient(new ConfigService({ RMU_HTTP_TIMEOUT_MS: 1234 })).get(URL);

    expect(timeouts).toHaveBeenCalledWith(1234);
    expect(fetch).toHaveBeenCalledOnce();
    timeouts.mockRestore();
  });
});

describe('HttpClient timeout', () => {
  let server: Server | undefined;

  afterEach(async () => {
    server?.closeAllConnections();
    await new Promise(resolve => server?.close(resolve));
  });

  // Spec 021, decision 7 [F-tactical-08]: an API that never answers is a 504 upstream-timeout.
  it('turns an API that does not answer into a gateway timeout', async () => {
    server = createServer(() => undefined);
    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    const client = new HttpClient(new ConfigService({ RMU_HTTP_TIMEOUT_MS: 50 }));

    const error = (await client.get(`http://127.0.0.1:${port}/v1/characters/c-1`).catch((e: unknown) => e)) as GatewayTimeoutError;

    expect(error).toBeInstanceOf(GatewayTimeoutError);
    expect(error.statusCode).toBe(504);
    expect(error.code).toBe('upstream-timeout');
    expect(error.message).toBe('127.0.0.1/v1/characters/c-1 did not answer in 50 ms');
  });
});
