import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { ProjectNotFoundException } from '../../../domain/exceptions';
import { Project } from '../../../domain/project.aggregate';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../../domain/ports/project.repository';
import { GetProjectQuery } from '../get-project.query';

@QueryHandler(GetProjectQuery)
export class GetProjectHandler implements IQueryHandler<
  GetProjectQuery,
  Result<Project, DomainException>
> {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  public async execute(
    query: GetProjectQuery,
  ): Promise<Result<Project, DomainException>> {
    const project = await this.projectRepository.findByIdForOwner(
      query.projectId,
      query.ownerId,
    );

    return project
      ? Result.ok(project)
      : Result.fail(new ProjectNotFoundException(query.projectId));
  }
}
