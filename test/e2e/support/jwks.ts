import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export const ISSUER = 'http://localhost/sso/realms/rmu-e2e';
export const AUDIENCE = 'rmu-api';

export type TokenClaims = { sub: string; groups?: readonly string[]; iss?: string; aud?: string; exp?: number };

const base64url = (value: object | Buffer) => (Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value))).toString('base64url');

/**
 * A JWKS endpoint on a free local port and RS256 tokens signed with its key, so the e2e suite goes through the real
 * JwtStrategy (jwks-rsa, issuer, audience and expiry checks) instead of replacing the guard.
 */
export class LocalJwks {
  private readonly kid = randomUUID();
  private readonly keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  private server?: Server;

  uri = '';

  async start(): Promise<void> {
    const jwk = { ...this.keys.publicKey.export({ format: 'jwk' }), kid: this.kid, alg: 'RS256', use: 'sig' };
    this.server = createServer((_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ keys: [jwk] }));
    });
    await new Promise<void>(resolve => this.server!.listen(0, '127.0.0.1', resolve));
    this.uri = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}/certs`;
  }

  async stop(): Promise<void> {
    await new Promise<void>(resolve => (this.server ? this.server.close(() => resolve()) : resolve()));
  }

  /** A signed access token; the defaults are a valid token for one hour. */
  token(claims: TokenClaims): string {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url({ alg: 'RS256', typ: 'JWT', kid: this.kid });
    const payload = base64url({ iss: ISSUER, aud: AUDIENCE, iat: now, exp: now + 3600, groups: [], ...claims });
    const signature = sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), this.keys.privateKey);
    return `${header}.${payload}.${base64url(signature)}`;
  }
}
