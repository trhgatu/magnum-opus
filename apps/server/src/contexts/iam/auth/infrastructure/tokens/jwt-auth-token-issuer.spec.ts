import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';

import { JwtAuthTokenIssuer } from './jwt-auth-token-issuer';

describe('JwtAuthTokenIssuer', () => {
  const jwt = { sign: jest.fn() } as unknown as jest.Mocked<JwtService>;
  const config = {
    getOrThrow: jest.fn((key: string) => `${key}-value`),
  } as unknown as jest.Mocked<ConfigService>;
  const issuer = new JwtAuthTokenIssuer(jwt, config);

  beforeEach(() => {
    jest.clearAllMocks();
    jwt.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');
  });

  it('maps application input to access and refresh JWTs', () => {
    const result = issuer.issue({
      userId: 'user-1',
      email: 'member@example.com',
      permissions: ['users.read'],
      tokenVersion: 3,
      jti: 'session-1',
      refreshTtlSeconds: 3600,
    });

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(jwt.sign).toHaveBeenNthCalledWith(
      1,
      {
        sub: 'user-1',
        email: 'member@example.com',
        permissions: ['users.read'],
        tokenVersion: 3,
        jti: 'session-1',
      },
      { secret: 'JWT_ACCESS_SECRET-value', expiresIn: '15m' },
    );
    expect(jwt.sign).toHaveBeenNthCalledWith(
      2,
      {
        sub: 'user-1',
        email: 'member@example.com',
        jti: 'session-1',
      },
      { secret: 'JWT_REFRESH_SECRET-value', expiresIn: 3600 },
    );
  });
});
