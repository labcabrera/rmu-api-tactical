import { Injectable } from '@nestjs/common';
import { BadGatewayError, ValidationError } from '../../domain/errors/errors';

/** Options of a call to another RMU API: the bearer token to send and any extra headers. */
export interface HttpRequestOptions {
  token?: string;
  headers?: Record<string, string>;
}

/** Network errors that mean "the other API is not there" (refused, unknown host, reset, timed out). */
const UNAVAILABLE_CODES = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED'];

/**
 * A non-2xx answer of a 400 or 422: the caller's input, so it maps to a ValidationError (400). `status` is the
 * status the other API answered (it replaces the 400 of ValidationError.status, which no filter reads).
 */
export class UpstreamValidationError extends ValidationError {
  constructor(
    message: string,
    public override readonly status: number,
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, UpstreamValidationError.prototype);
  }
}

/** Any other non-2xx answer (401/403 on our token, 404, 5xx): a failure of the other API, so a BadGatewayError (502). */
export class UpstreamBadGatewayError extends BadGatewayError {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'BadGatewayError';
    Object.setPrototypeOf(this, UpstreamBadGatewayError.prototype);
  }
}

/**
 * The error of a call that got an answer, with its HTTP `status`. It is still the DomainError the status maps to (so
 * it reaches the client as a 400 or a 502), and a caller that treats a status apart checks it:
 * `if (isUpstreamHttpError(err) && err.status === 404) return null;`
 */
export type UpstreamHttpError = UpstreamValidationError | UpstreamBadGatewayError;

export function isUpstreamHttpError(error: unknown): error is UpstreamHttpError {
  return error instanceof UpstreamValidationError || error instanceof UpstreamBadGatewayError;
}

/**
 * JSON client for the other RMU APIs over the global fetch of Node 24 (spec 020, decision 5). A failed call becomes a
 * DomainError, so the client gets the reason (which API, its status and its message) instead of a generic 500:
 * - no answer (ECONNREFUSED, ENOTFOUND, EAI_AGAIN, ECONNRESET, ETIMEDOUT): `BadGatewayError('<host><path> is not available (<code>)')`;
 * - 400 or 422: `ValidationError('<host><path> answered <status>: <upstream message>')` (UpstreamValidationError);
 * - any other non-2xx: `BadGatewayError` with the same message (UpstreamBadGatewayError).
 * There is no timeout, as with axios before it [F-tactical-08].
 */
@Injectable()
export class HttpClient {
  get<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('GET', url, undefined, options);
  }

  post<T>(url: string, body: unknown, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('POST', url, body, options);
  }

  patch<T>(url: string, body: unknown, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('PATCH', url, body, options);
  }

  put<T>(url: string, body: unknown, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('PUT', url, body, options);
  }

  delete<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  private async request<T>(method: string, url: string, body: unknown, options: HttpRequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    const response = await sendRequest(url, {
      method,
      headers: { ...headers, ...options.headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await readBody(response);
    if (!response.ok) throw upstreamError(url, response.status, response.statusText, data);
    return data as T;
  }
}

/** fetch, with a network failure turned into a BadGatewayError. */
export async function sendRequest(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    throw networkError(error, url);
  }
}

/** The body of an answer: parsed JSON, the text if it is not JSON, or undefined if it is empty. */
export async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** The DomainError of a non-2xx answer (see HttpClient). */
export function upstreamError(url: string, status: number, statusText: string, data: unknown): UpstreamHttpError {
  const reason = upstreamMessage(data) ?? statusText ?? '';
  const detail = `${describeTarget(url)} answered ${status}${reason ? `: ${reason}` : ''}`;
  return status === 400 || status === 422 ? new UpstreamValidationError(detail, status) : new UpstreamBadGatewayError(detail, status);
}

/** The BadGatewayError of a call that got no answer. fetch rejects with `TypeError('fetch failed')` and the cause. */
export function networkError(error: unknown, url: string): BadGatewayError {
  const target = describeTarget(url);
  const code = networkErrorCode(error);
  if (code && UNAVAILABLE_CODES.includes(code)) return new BadGatewayError(`${target} is not available (${code})`);
  const message = error instanceof Error ? error.message : String(error);
  return new BadGatewayError(`${target} request failed: ${message}`);
}

function networkErrorCode(error: unknown): string | undefined {
  const cause = (error as { cause?: unknown } | undefined)?.cause as { code?: unknown; errors?: { code?: unknown }[] } | undefined;
  const code = cause?.code ?? cause?.errors?.[0]?.code ?? (error as { code?: unknown } | undefined)?.code;
  return typeof code === 'string' ? code : undefined;
}

// For example `rmu-api-strategic/v1/strategic-games/<id>` (no scheme, port or query string).
function describeTarget(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    return `${hostname}${pathname}`;
  } catch {
    return url;
  }
}

function upstreamMessage(data: unknown): string | undefined {
  if (!data) return undefined;
  if (typeof data === 'string') return data.slice(0, 300);
  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return undefined;
}
