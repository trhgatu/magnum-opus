import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { ProjectNotFoundException } from '../../../domain/exceptions';
import {
  CYCLE_ACTIVITY_SNAPSHOT_REPOSITORY,
  type CycleActivitySnapshot,
  type CycleActivitySnapshotRepository,
} from '../../../domain/ports/cycle-activity-snapshot.repository';
import {
  PROJECT_DECLARATION_READER,
  type ProjectDeclarationReader,
} from '../../ports/project-declaration-reader.port';
import { ListCycleSnapshotsQuery } from '..';

/** Snapshot của các Cycle đã khép, đúng như lúc chụp (07 §5.5). */
@QueryHandler(ListCycleSnapshotsQuery)
export class ListCycleSnapshotsHandler implements IQueryHandler<
  ListCycleSnapshotsQuery,
  Result<CycleActivitySnapshot[], DomainException>
> {
  constructor(
    @Inject(PROJECT_DECLARATION_READER)
    private readonly declarations: ProjectDeclarationReader,
    @Inject(CYCLE_ACTIVITY_SNAPSHOT_REPOSITORY)
    private readonly snapshots: CycleActivitySnapshotRepository,
  ) {}

  async execute({
    ownerId,
    projectId,
  }: ListCycleSnapshotsQuery): Promise<
    Result<CycleActivitySnapshot[], DomainException>
  > {
    if (!(await this.declarations.exists(ownerId, projectId))) {
      return Result.fail(new ProjectNotFoundException(projectId));
    }
    // Lịch sử: vẫn hiện kể cả khi mọi nguồn đã gỡ hay GitHub đã ngắt.
    return Result.ok(await this.snapshots.listByProject(ownerId, projectId));
  }
}
