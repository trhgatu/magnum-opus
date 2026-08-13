import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RefreshCommand } from '../refresh.command';
import { SESSION_STORE, ISessionStore } from '../../ports/session-store.port';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import {
  AUTH_TOKEN_ISSUER,
  type AuthTokenIssuer,
} from '../../ports/auth-token-issuer.port';
import { UserNotFoundException } from '@iam/users/domain/exceptions/user-not-found.exception';
import { RefreshSessionConsumedException } from '../../../domain/exceptions/refresh-session-consumed.exception';
import {
  getRefreshSessionAbsoluteExpiry,
  getRemainingSessionTtlSeconds,
} from '../../../domain/session-policy';

@CommandHandler(RefreshCommand)
export class RefreshCommandHandler implements ICommandHandler<
  RefreshCommand,
  Result<{ accessToken: string; refreshToken: string }, DomainException>
> {
  constructor(
    @Inject(AUTH_TOKEN_ISSUER)
    private readonly tokenIssuer: AuthTokenIssuer,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(SESSION_STORE)
    private readonly sessionStore: ISessionStore,
  ) {}

  async execute(
    command: RefreshCommand,
  ): Promise<
    Result<{ accessToken: string; refreshToken: string }, DomainException>
  > {
    const { userId, jti: oldJti } = command;

    const user = await this.userRepository.findById(userId);
    if (!user) {
      return Result.fail(new UserNotFoundException(userId));
    }
    const permissions = await this.userRepository.getPermissions(userId);
    const newJti = this.userRepository.nextIdentity();
    const oldData = await this.sessionStore.getRefreshTokenSession(
      userId,
      oldJti,
    );
    if (!oldData) {
      const replay = await this.sessionStore.getRefreshReplay(userId, oldJti);
      if (replay) return Result.ok(replay);
      return Result.fail(new RefreshSessionConsumedException());
    }

    const absoluteExpiresAt =
      oldData.absoluteExpiresAt ??
      getRefreshSessionAbsoluteExpiry(oldData.createdAt);
    const remainingTtlSeconds =
      getRemainingSessionTtlSeconds(absoluteExpiresAt);
    if (remainingTtlSeconds <= 0) {
      await this.sessionStore.revokeRefreshToken(userId, oldJti);
      return Result.fail(new RefreshSessionConsumedException());
    }

    const tokens = this.tokenIssuer.issue({
      userId,
      email: user.email,
      permissions,
      tokenVersion: user.tokenVersion,
      jti: newJti,
      refreshTtlSeconds: remainingTtlSeconds,
    });

    const sessionData = {
      ...oldData,
      jti: newJti,
      sessionId: oldData.sessionId ?? oldData.jti,
      absoluteExpiresAt,
    };

    const rotated = await this.sessionStore.rotateRefreshToken(
      userId,
      oldJti,
      newJti,
      sessionData,
      tokens,
      remainingTtlSeconds,
    );
    if (!rotated.tokens) {
      return Result.fail(new RefreshSessionConsumedException());
    }

    return Result.ok(rotated.tokens);
  }
}
