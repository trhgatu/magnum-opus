import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  GITHUB_CONNECTION_REPOSITORY,
  type GitHubConnectionRepository,
} from '../../../domain/ports/github-connection.repository';
import { DisconnectGitHubCommand } from '../disconnect-github.command';

@CommandHandler(DisconnectGitHubCommand)
export class DisconnectGitHubHandler implements ICommandHandler<
  DisconnectGitHubCommand,
  Result<void, DomainException>
> {
  constructor(
    @Inject(GITHUB_CONNECTION_REPOSITORY)
    private readonly repository: GitHubConnectionRepository,
  ) {}

  async execute({
    ownerId,
  }: DisconnectGitHubCommand): Promise<Result<void, DomainException>> {
    await this.repository.deleteByOwner(ownerId);
    return Result.ok(undefined);
  }
}
