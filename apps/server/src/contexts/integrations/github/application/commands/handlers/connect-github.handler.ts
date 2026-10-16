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
import { GITHUB_API, type GitHubApi } from '../../ports/github-api.port';
import { TOKEN_CIPHER, type TokenCipher } from '../../ports/token-cipher.port';
import { ConnectGitHubCommand } from '../connect-github.command';

@CommandHandler(ConnectGitHubCommand)
export class ConnectGitHubHandler implements ICommandHandler<
  ConnectGitHubCommand,
  Result<GitHubConnection, DomainException>
> {
  constructor(
    @Inject(GITHUB_API) private readonly githubApi: GitHubApi,
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
      const verified = await this.githubApi.verifyToken(token);
      const now = this.clock.now();
      const encryptedToken = this.cipher.encrypt(token);

      const existing = await this.repository.findByOwner(ownerId);
      const connection =
        existing ??
        GitHubConnection.connect({
          id: randomUUID(),
          ownerId,
          account: verified.account,
          encryptedToken,
          expiresAt: verified.expiresAt,
          now,
        });

      if (existing) {
        // Ném GitHubAccountChangeUnconfirmedException nếu đổi tài khoản
        // mà chưa xác nhận — trước khi lưu, nên kết nối cũ giữ nguyên.
        existing.replaceToken({
          account: verified.account,
          encryptedToken,
          expiresAt: verified.expiresAt,
          now,
          confirmAccountChange,
        });
      }

      await this.repository.save(connection);
      return Result.ok(connection);
    } catch (error) {
      if (error instanceof DomainException) return Result.fail(error);
      throw error;
    }
  }
}
