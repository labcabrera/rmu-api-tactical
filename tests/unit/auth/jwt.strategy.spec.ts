import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync, sign } from 'crypto';
import { JwtStrategy } from '../../../src/modules/auth/jwt.strategy';

const mockKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });

vi.mock('jwks-rsa', () => ({
  passportJwtSecret: () => (_req: unknown, _token: unknown, done: (err: Error | null, key?: string) => void) =>
    done(null, mockKeys.publicKey.export({ type: 'spki', format: 'pem' }).toString()),
}));

const ISSUER = 'http://localhost/sso/realms/rmu';
const AUDIENCE = 'rmu-api';

const config: Record<string, string> = {
  RMU_IAM_JWK_URI: 'http://localhost:8090/sso/realms/rmu/protocol/openid-connect/certs',
  RMU_IAM_ISSUER_URI: ISSUER,
  RMU_IAM_AUDIENCE: AUDIENCE,
};

const configService = { get: (key: string) => config[key] } as unknown as ConfigService;

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

const signToken = (claims: Record<string, unknown>) => {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url({ alg: 'RS256', typ: 'JWT' })}.${base64url({ iat: now, exp: now + 300, ...claims })}`;
  const signature = sign('RSA-SHA256', Buffer.from(unsigned), mockKeys.privateKey).toString('base64url');
  return `${unsigned}.${signature}`;
};

type AuthResult = { outcome: 'success'; user: Record<string, unknown> } | { outcome: 'fail' | 'error' };

const authenticate = (token: string): Promise<AuthResult> => {
  const strategy = new JwtStrategy(configService) as unknown as {
    authenticate: (req: unknown) => void;
    success: (user: Record<string, unknown>) => void;
    fail: () => void;
    error: () => void;
  };
  return new Promise(resolve => {
    strategy.success = user => resolve({ outcome: 'success', user });
    strategy.fail = () => resolve({ outcome: 'fail' });
    strategy.error = () => resolve({ outcome: 'error' });
    strategy.authenticate({ headers: { authorization: `Bearer ${token}` } });
  });
};

describe('JwtStrategy', () => {
  const claims = {
    sub: 'user-1',
    iss: ISSUER,
    aud: ['account', AUDIENCE],
    email: 'user@example.com',
    preferred_username: 'user',
    groups: ['RMU_ADMIN'],
  };

  it('accepts a token with the configured issuer and audience', async () => {
    const result = await authenticate(signToken(claims));

    expect(result).toEqual({
      outcome: 'success',
      user: expect.objectContaining({ id: 'user-1', username: 'user', roles: ['RMU_ADMIN'] }) as unknown,
    });
  });

  it('rejects a token from another issuer', async () => {
    const result = await authenticate(signToken({ ...claims, iss: 'http://localhost:8090/realms/rmu' }));

    expect(result.outcome).toBe('fail');
  });

  it('rejects a token without the configured audience', async () => {
    const result = await authenticate(signToken({ ...claims, aud: 'account' }));

    expect(result.outcome).toBe('fail');
  });
});
