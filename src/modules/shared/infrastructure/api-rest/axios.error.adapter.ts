import axios from 'axios';
import { BadGatewayError, ValidationError } from '../../domain/errors';

const UNAVAILABLE_CODES = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED'];

// Turns a failed call to another RMU API into a DomainError, so the client gets the reason (which API,
// its status and its message) instead of a generic 500. 400/422 are the caller's input; anything else
// (401/403 on our service token, 5xx, unreachable) is a failure of the upstream API: 502.
export function handleAxiosError(err: any, url: string): Error {
  if (!axios.isAxiosError(err)) return err as Error;
  const target = describeTarget(url);
  if (!err.response) {
    if (err.code && UNAVAILABLE_CODES.includes(err.code)) {
      return new BadGatewayError(`${target} is not available (${err.code})`);
    }
    return new BadGatewayError(`${target} request failed: ${err.message}`);
  }
  const status = err.response.status;
  const reason = upstreamMessage(err.response.data) ?? err.response.statusText ?? '';
  const detail = `${target} answered ${status}${reason ? `: ${reason}` : ''}`;
  if (status === 400 || status === 422) {
    return new ValidationError(detail);
  }
  return new BadGatewayError(detail);
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
