import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  PROJECT_READER,
  type FindProjectsResult,
  type ProjectReader,
} from '../../ports/project-reader.port';
import { GetProjectsQuery } from '../get-projects.query';

@QueryHandler(GetProjectsQuery)
export class GetProjectsHandler implements IQueryHandler<
  GetProjectsQuery,
  Result<FindProjectsResult, DomainException>
> {
  constructor(
    @Inject(PROJECT_READER)
    private readonly projectReader: ProjectReader,
  ) {}

  public async execute(
    query: GetProjectsQuery,
  ): Promise<Result<FindProjectsResult, DomainException>> {
    const result = await this.projectReader.findAllForOwner(query.ownerId, {
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      search: query.search,
      state: query.state,
    });

    return Result.ok(result);
  }
}
