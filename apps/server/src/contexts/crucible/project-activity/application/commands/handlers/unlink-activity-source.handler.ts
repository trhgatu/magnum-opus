import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  ActivitySourceNotFoundException,
  ProjectNotFoundException,
} from '../../../domain/exceptions';
import {
  PROJECT_ACTIVITY_SOURCE_REPOSITORY,
  type ProjectActivitySourceRepository,
} from '../../../domain/ports/project-activity-source.repository';
import {
  PROJECT_DECLARATION_READER,
  type ProjectDeclarationReader,
} from '../../ports/project-declaration-reader.port';
import { UnlinkActivitySourceCommand } from '..';

/** Gỡ nguồn: chỉ xóa mối nối; feed, sổ và snapshot ở lại (BR-PAC-007). */
@CommandHandler(UnlinkActivitySourceCommand)
export class UnlinkActivitySourceHandler implements ICommandHandler<
  UnlinkActivitySourceCommand,
  Result<void, DomainException>
> {
  constructor(
    @Inject(PROJECT_DECLARATION_READER)
    private readonly declarations: ProjectDeclarationReader,
    @Inject(PROJECT_ACTIVITY_SOURCE_REPOSITORY)
    private readonly sources: ProjectActivitySourceRepository,
  ) {}

  async execute({
    ownerId,
    projectId,
    feedId,
  }: UnlinkActivitySourceCommand): Promise<Result<void, DomainException>> {
    if (!(await this.declarations.exists(ownerId, projectId))) {
      return Result.fail(new ProjectNotFoundException(projectId));
    }
    if (!(await this.sources.unlink(ownerId, projectId, feedId))) {
      return Result.fail(new ActivitySourceNotFoundException(feedId));
    }
    return Result.ok(undefined);
  }
}
