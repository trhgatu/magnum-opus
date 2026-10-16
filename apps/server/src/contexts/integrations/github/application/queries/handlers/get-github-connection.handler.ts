import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import type { GitHubConnection } from '../../../domain/github-connection.entity';
import {
  GITHUB_CONNECTION_REPOSITORY,
  type GitHubConnectionRepository,
} from '../../../domain/ports/github-connection.repository';
import { GetGitHubConnectionQuery } from '../get-github-connection.query';

@QueryHandler(GetGitHubConnectionQuery)
export class GetGitHubConnectionHandler implements IQueryHandler<
  GetGitHubConnectionQuery,
  Result<GitHubConnection | null, DomainException>
> {
  constructor(
    @Inject(GITHUB_CONNECTION_REPOSITORY)
    private readonly repository: GitHubConnectionRepository,
  ) {}

  async execute({
    ownerId,
  }: GetGitHubConnectionQuery): Promise<
    Result<GitHubConnection | null, DomainException>
  > {
    return Result.ok(await this.repository.findByOwner(ownerId));
  }
}
