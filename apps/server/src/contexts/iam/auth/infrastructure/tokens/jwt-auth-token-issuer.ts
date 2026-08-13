import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type {
  AuthTokenIssuer,
  AuthTokens,
  IssueAuthTokensInput,
} from '../../application/ports/auth-token-issuer.port';

@Injectable()
export class JwtAuthTokenIssuer implements AuthTokenIssuer {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  public issue(input: IssueAuthTokensInput): AuthTokens {
    return {
      accessToken: this.jwt.sign(
        {
          sub: input.userId,
          email: input.email,
          permissions: input.permissions,
          tokenVersion: input.tokenVersion,
          jti: input.jti,
        },
        {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: '15m',
        },
      ),
      refreshToken: this.jwt.sign(
        { sub: input.userId, email: input.email, jti: input.jti },
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: input.refreshTtlSeconds,
        },
      ),
    };
  }
}
