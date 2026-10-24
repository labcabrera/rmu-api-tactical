import type { ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { GatewayTimeoutError } from '../../../../src/modules/shared/domain/errors/errors.js';
import { HttpExceptionFilter } from '../../../../src/modules/shared/interfaces/http/http-exception.filter.js';

/** Runs the filter on one exception and returns the status and the body it sent. */
const send = (
  exception: unknown,
  request = { method: 'GET', originalUrl: '/v1/tactical-games/g-1?x=1', path: '/v1/tactical-games/g-1' },
) => {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  new HttpExceptionFilter().catch(exception, host);
  return { status: (status.mock.calls[0] as unknown[])[0], body: (json.mock.calls[0] as unknown[])[0] as Record<string, unknown> };
};

describe('HttpExceptionFilter', () => {
  // Spec 021, decision 7: the statusCode of the DomainError drives the answer.
  it('answers 504 upstream-timeout to an API that did not answer in time', () => {
    const { status, body } = send(new GatewayTimeoutError('rmu-api-strategic/v1/characters/c-1 did not answer in 50 ms'));

    expect(status).toBe(504);
    expect(body).toMatchObject({ statusCode: 504, error: 'GatewayTimeoutError', code: 'upstream-timeout', errorCode: 'upstream-timeout' });
  });

  // Spec 021 [F-receta-22]: the path of the body has no query string.
  it('sends the path without the query string', () => {
    const { body } = send(new GatewayTimeoutError('x'));
    expect(body.path).toBe('/v1/tactical-games/g-1');
  });
});
