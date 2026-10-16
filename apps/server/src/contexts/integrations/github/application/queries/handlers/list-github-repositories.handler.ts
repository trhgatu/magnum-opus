import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  GitHubNotConnectedException,
  GitHubTokenInvalidException,
} from '../../../domain/exceptions';
import {
  GITHUB_CONNECTION_REPOSITORY,
  type GitHubConnectionRepository,
} from '../../../domain/ports/github-connection.repository';
import { CLOCK, type Clock } from '../../ports/clock.port';
import {
  GITHUB_API,
  type GitHubApi,
  type GitHubRepository,
} from '../../ports/github-api.port';
import { TOKEN_CIPHER, type TokenCipher } from '../../ports/token-cipher.port';
import { ListGitHubRepositoriesQuery } from '../list-github-repositories.query';

/** Ô chọn repository chỉ cần chừng này; muốn thấy repo khác thì gõ thêm tên. */
const MAX_REPOSITORIES = 100;

export interface GitHubRepositorySelection {
  repositories: GitHubRepository[];
  /** true: còn repository phù hợp nhưng không được trả về. */
  truncated: boolean;
}

@QueryHandler(ListGitHubRepositoriesQuery)
export class ListGitHubRepositoriesHandler implements IQueryHandler<
  ListGitHubRepositoriesQuery,
  Result<GitHubRepositorySelection, DomainException>
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
    search,
  }: ListGitHubRepositoriesQuery): Promise<
    Result<GitHubRepositorySelection, DomainException>
  > {
    const connection = await this.repository.findByOwner(ownerId);
    // Chưa kết nối, đã thu hồi hoặc hết hạn: không gọi GitHub cho phí request.
    if (!connection?.isUsableAt(this.clock.now())) {
      return Result.fail(new GitHubNotConnectedException());
    }

    try {
      const list = await this.gitHubApi.listRepositories(
        this.cipher.decrypt(connection.encryptedToken),
      );
      const matched = sortByLastPush(filterByName(list.repositories, search));

      return Result.ok({
        repositories: matched.slice(0, MAX_REPOSITORIES),
        truncated: matched.length > MAX_REPOSITORIES || !list.complete,
      });
    } catch (error) {
      if (error instanceof GitHubTokenInvalidException) {
        // Token bị thu hồi bên GitHub sau khi kết nối: ghi nhận để client
        // hiện "Kết nối lại" thay vì lỗi mãi. Có điều kiện: một lần kết nối
        // lại xen giữa request này không bị ghi đè.
        await this.repository.revokeIfTokenUnchanged(
          ownerId,
          connection.encryptedToken,
        );
        return Result.fail(new GitHubNotConnectedException());
      }
      if (error instanceof DomainException) return Result.fail(error);
      throw error;
    }
  }
}

function filterByName(
  repositories: GitHubRepository[],
  search: string | undefined,
): GitHubRepository[] {
  const term = search?.trim().toLowerCase();
  if (!term) return repositories;
  return repositories.filter((repo) =>
    repo.fullName.toLowerCase().includes(term),
  );
}

/** pushedAt giảm dần; repository chưa push lần nào xếp cuối. */
function sortByLastPush(repositories: GitHubRepository[]): GitHubRepository[] {
  return [...repositories].sort((a, b) => {
    if (a.pushedAt === null) return b.pushedAt === null ? 0 : 1;
    if (b.pushedAt === null) return -1;
    return b.pushedAt.getTime() - a.pushedAt.getTime();
  });
}
