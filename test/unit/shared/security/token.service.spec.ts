import type { ConfigService } from '@nestjs/config';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, Observable } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BadGatewayError } from '../../../../src/modules/shared/domain/errors/errors.js';
import { RequestTokenInterceptor } from '../../../../src/modules/shared/infrastructure/security/request-token.context.js';
import { TokenService } from '../../../../src/modules/shared/infrastructure/security/token.service.js';

const config: Record<string, string> = {
  RMU_IAM_TOKEN_URI: 'http://keycloak/realms/rmu/protocol/openid-connect/token',
  RMU_IAM_CLIENT_ID: 'rmu-api-tactical',
  RMU_IAM_CLIENT_SECRET: 'secret',
};
const configService = { get: (key: string) => config[key] } as unknown as ConfigService;

const stubTokenEndpoint = (status = 200) => {
  const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() =>
    Promise.resolve(
      new Response(JSON.stringify(status === 200 ? { access_token: 'service', expires_in: 300 } : { message: 'denied' }), { status }),
    ),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
};

const httpContext = (authorization?: string) =>
  ({ getType: () => 'http', switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }) }) as unknown as ExecutionContext;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TokenService', () => {
  it('asks Keycloak for a client-credentials token and caches it', async () => {
    const fetch = stubTokenEndpoint();
    const service = new TokenService(configService);

    expect(await service.getToken()).toBe('service');
    expect(await service.getToken()).toBe('service');

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(config.RMU_IAM_TOKEN_URI);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });
    expect((init?.body as URLSearchParams).toString()).toBe(
      'grant_type=client_credentials&client_id=rmu-api-tactical&client_secret=secret',
    );
  });

  it("forwards the caller's own token while an HTTP request is handled", async () => {
    const fetch = stubTokenEndpoint();
    const service = new TokenService(configService);
    const next: CallHandler = {
      handle: () =>
        new Observable(subscriber => {
          void service.getToken().then(token => {
            subscriber.next(token);
            subscriber.complete();
          });
        }),
    };

    const token = await lastValueFrom(new RequestTokenInterceptor().intercept(httpContext('Bearer user-token'), next));

    expect(token).toBe('user-token');
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports Keycloak's refusal as a bad gateway", async () => {
    stubTokenEndpoint(401);

    await expect(new TokenService(configService).getToken()).rejects.toBeInstanceOf(BadGatewayError);
  });
});
