import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  PROJECT_READER,
  type FocusCandidate,
  type ProjectReader,
} from '../../ports/project-reader.port';
import { chooseFocusProject } from '../../services/focus-project';
import { GetFocusProjectQuery } from '../get-focus-project.query';

@QueryHandler(GetFocusProjectQuery)
export class GetFocusProjectHandler implements IQueryHandler<
  GetFocusProjectQuery,
  Result<FocusCandidate | null, DomainException>
> {
  constructor(
    @Inject(PROJECT_READER)
    private readonly projectReader: ProjectReader,
  ) {}

  public async execute(
    query: GetFocusProjectQuery,
  ): Promise<Result<FocusCandidate | null, DomainException>> {
    const candidates = await this.projectReader.findFocusCandidates(
      query.ownerId,
    );

    return Result.ok(chooseFocusProject(candidates));
  }
}
