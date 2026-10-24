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
import {
  TOKEN_CIPHER,
  type TokenCipher,
} from '../../../../shared/application/ports/token-cipher.port';
import { ConnectGitHubCommand } from '../connect-github.command';

/**
 * Số lần thử khi đụng độ với một request đồng thời của cùng owner (một
 * connect khác vừa tạo kết nối, hoặc một disconnect vừa xóa nó). Mỗi lần
 * thử đọc lại trạng thái mới nhất; hai lần đụng độ liên tiếp đã hiếm.
 */
const MAX_ATTEMPTS = 3;

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
      const encryptedToken = this.cipher.encrypt(token);

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const saved = await this.trySave(ownerId, verified, encryptedToken, {
          confirmAccountChange,
        });
        if (saved) return Result.ok(saved);
      }

      throw new Error(
        'GitHub connection kept changing concurrently while connecting',
      );
    } catch (error) {
      if (error instanceof DomainException) return Result.fail(error);
      throw error;
    }
  }

  /** Một lần thử. null nghĩa là đụng độ với request khác — thử lại. */
  private async trySave(
    ownerId: string,
    verified: VerifiedGitHubToken,
    encryptedToken: string,
    { confirmAccountChange }: { confirmAccountChange: boolean },
  ): Promise<GitHubConnection | null> {
    const now = this.clock.now();
    const existing = await this.repository.findByOwner(ownerId);

    if (!existing) {
      const created = GitHubConnection.connect({
        id: randomUUID(),
        ownerId,
        account: verified.account,
        encryptedToken,
        expiresAt: verified.expiresAt,
        now,
      });
      // false: một request khác vừa tạo kết nối — lần sau đi luồng thay
      // token, kể cả bước xác nhận đổi tài khoản, thay vì ghi đè nó.
      return (await this.repository.insert(created)) ? created : null;
    }

    // Ném GitHubAccountChangeUnconfirmedException trước khi ghi gì vào DB.
    existing.replaceToken({
      account: verified.account,
      encryptedToken,
      expiresAt: verified.expiresAt,
      now,
      confirmAccountChange,
    });
    // false: kết nối vừa bị ngắt — lần sau đi luồng tạo mới.
    return (await this.repository.update(existing)) ? existing : null;
  }
}
