import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import {
  LogoutAllCommandHandler,
  RevokeSessionCommandHandler,
  LogoutCommandHandler,
  RegisterHandler,
  LoginCommandHandler,
  RefreshCommandHandler,
  RevokeOtherSessionsCommandHandler,
  RequestPasswordResetHandler,
  ResetPasswordHandler,
  VerifyEmailHandler,
  RequestEmailVerificationHandler,
} from './application/commands/handlers';
import { GetActiveSessionsQueryHandler } from './application/queries/handlers';
import { UsersModule } from '../users/users.module';
import { AuthController } from './presentation/controllers/auth.controller';
import { JwtRefreshStrategy, JwtStrategy } from './presentation/strategies';
import { SESSION_STORE } from './application/ports/session-store.port';
import { RedisSessionStore } from './infrastructure/stores/redis-session.store';
import { AccessTokenValidator } from './application/services/access-token-validator.service';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { PASSWORD_RESET_TOKEN_STORE } from './application/ports/password-reset-token-store.port';
import { PrismaPasswordResetTokenStore } from './infrastructure/stores/prisma-password-reset-token.store';
import { EMAIL_VERIFICATION_TOKEN_STORE } from './application/ports/email-verification-token-store.port';
import { PrismaEmailVerificationTokenStore } from './infrastructure/stores/prisma-email-verification-token.store';
import { EmailVerificationService } from './application/services/email-verification.service';
import { AUTH_TOKEN_ISSUER } from './application/ports/auth-token-issuer.port';
import { AUTH_POLICY } from './application/ports/auth-policy.port';
import { OPAQUE_TOKEN } from './application/ports/opaque-token.port';
import { JwtAuthTokenIssuer } from './infrastructure/tokens/jwt-auth-token-issuer';
import { CryptoOpaqueToken } from './infrastructure/tokens/crypto-opaque-token';
import { EnvironmentAuthPolicy } from './infrastructure/config/environment-auth-policy';

@Module({
  imports: [
    CqrsModule,
    UsersModule,
    QueueModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: SESSION_STORE,
      useClass: RedisSessionStore,
    },
    RegisterHandler,
    LoginCommandHandler,
    RefreshCommandHandler,
    LogoutCommandHandler,
    LogoutAllCommandHandler,
    RevokeSessionCommandHandler,
    RevokeOtherSessionsCommandHandler,
    GetActiveSessionsQueryHandler,
    JwtStrategy,
    JwtRefreshStrategy,
    AccessTokenValidator,
    RequestPasswordResetHandler,
    ResetPasswordHandler,
    VerifyEmailHandler,
    RequestEmailVerificationHandler,
    EmailVerificationService,
    {
      provide: AUTH_TOKEN_ISSUER,
      useClass: JwtAuthTokenIssuer,
    },
    {
      provide: AUTH_POLICY,
      useClass: EnvironmentAuthPolicy,
    },
    {
      provide: OPAQUE_TOKEN,
      useClass: CryptoOpaqueToken,
    },
    {
      provide: PASSWORD_RESET_TOKEN_STORE,
      useClass: PrismaPasswordResetTokenStore,
    },
    {
      provide: EMAIL_VERIFICATION_TOKEN_STORE,
      useClass: PrismaEmailVerificationTokenStore,
    },
  ],
  exports: [
    PassportModule,
    JwtStrategy,
    JwtRefreshStrategy,
    SESSION_STORE,
    AccessTokenValidator,
  ],
})
export class AuthModule {}
