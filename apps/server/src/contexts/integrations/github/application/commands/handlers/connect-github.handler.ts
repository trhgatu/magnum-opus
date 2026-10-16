import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { GitHubConnection } from '../../../domain/github-connection.entity';
import {
  GITHUB_CONNECTION_REPOSITORY,
  type GitHubConnectionRepository,
} from '../../../domain/ports/github-connection.repository';
import { CLOCK, type Clock } from '../../ports/clock.port';
import {
  GITHUB_API,
  type GitHubApi,
  type VerifiedGitHubToken,
} from '../../ports/github-api.port';
import { TOKEN_CIPHER, type TokenCipher } from '../../ports/token-cipher.port';
import { ConnectGitHubCommand } from '../connect-github.command';

@CommandHandler(ConnectGitHubCommand)
export class ConnectGitHubHandler implements ICommandHandler<
  ConnectGitHubCommand,
  Result<GitHubConnection, DomainException>
> {
  constructor(
    @Inject(GITHUB_API) private readonly gitHubApi: GitHubApi,
    @Inject(TOKEN_CIPHER) private readonly cipher: TokenCipher,
    @Inject(GITHUB_CONNECTION_REPOSITORY)
    private readonly repository: GitHubConnectionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute({
    ownerId,
    token,
    confirmAccountChange,
  }: ConnectGitHubCommand): Promise<Result<GitHubConnection, DomainException>> {
    try {
      // Kiểm tra với GitHub trước: token sai thì không đụng gì tới DB.
      const verified = await this.gitHubApi.verifyToken(token);
      const now = this.clock.now();
      const encryptedToken = this.cipher.encrypt(token);

      const existing = await this.repository.findByOwner(ownerId);
      if (existing) {
        return await this.replace(existing, verified, encryptedToken, now, {
          confirmAccountChange,
        });
      }

      const created = GitHubConnection.connect({
        id: randomUUID(),
        ownerId,
        account: verified.account,
        encryptedToken,
        expiresAt: verified.expiresAt,
        now,
      });
      if (await this.repository.insert(created)) return Result.ok(created);

      // Một request khác vừa tạo kết nối cho owner này. Xử lý như thay
      // token — kể cả bước xác nhận đổi tài khoản — thay vì ghi đè nó.
      const concurrent = await this.repository.findByOwner(ownerId);
      if (!concurrent) {
        throw new Error('GitHub connection disappeared while connecting');
      }
      return await this.replace(concurrent, verified, encryptedToken, now, {
        confirmAccountChange,
      });
    } catch (error) {
      if (error instanceof DomainException) return Result.fail(error);
      throw error;
    }
  }

  /** Ném GitHubAccountChangeUnconfirmedException trước khi ghi gì vào DB. */
  private async replace(
    connection: GitHubConnection,
    verified: VerifiedGitHubToken,
    encryptedToken: string,
    now: Date,
    { confirmAccountChange }: { confirmAccountChange: boolean },
  ): Promise<Result<GitHubConnection, DomainException>> {
    connection.replaceToken({
      account: verified.account,
      encryptedToken,
      expiresAt: verified.expiresAt,
      now,
      confirmAccountChange,
    });
    await this.repository.update(connection);
    return Result.ok(connection);
  }
}
