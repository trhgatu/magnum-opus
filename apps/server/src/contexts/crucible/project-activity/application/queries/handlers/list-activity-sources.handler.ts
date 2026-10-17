import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  ACTIVITY_LEDGER_READER,
  type ActivityLedgerReader,
} from '@activity/application/ports/activity-ledger-reader.port';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { ProjectNotFoundException } from '../../../domain/exceptions';
import {
  PROJECT_ACTIVITY_SOURCE_REPOSITORY,
  type ProjectActivitySourceRepository,
} from '../../../domain/ports/project-activity-source.repository';
import {
  PROJECT_DECLARATION_READER,
  type ProjectDeclarationReader,
} from '../../ports/project-declaration-reader.port';
import { type ActivitySourceView, toSourceViews } from '../../views';
import { ListActivitySourcesQuery } from '..';

/** Nguồn của Project như sổ đang có — chỉ đọc, không chép (07 §5.1). */
@QueryHandler(ListActivitySourcesQuery)
export class ListActivitySourcesHandler implements IQueryHandler<
  ListActivitySourcesQuery,
  Result<ActivitySourceView[], DomainException>
> {
  constructor(
    @Inject(PROJECT_DECLARATION_READER)
    private readonly declarations: ProjectDeclarationReader,
    @Inject(PROJECT_ACTIVITY_SOURCE_REPOSITORY)
    private readonly sources: ProjectActivitySourceRepository,
    @Inject(ACTIVITY_LEDGER_READER)
    private readonly ledger: ActivityLedgerReader,
  ) {}

  async execute({
    ownerId,
    projectId,
  }: ListActivitySourcesQuery): Promise<
    Result<ActivitySourceView[], DomainException>
  > {
    if (!(await this.declarations.exists(ownerId, projectId))) {
      return Result.fail(new ProjectNotFoundException(projectId));
    }

    const links = await this.sources.listByProject(ownerId, projectId);
    const feeds = await this.ledger.listFeeds({
      ownerId,
      feedIds: links.map((link) => link.feedId),
    });
    return Result.ok(toSourceViews(links, feeds));
  }
}
