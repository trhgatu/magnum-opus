import { Inject, Injectable } from '@nestjs/common';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  ProjectNotFoundException,
  ProjectRevisionConflictException,
} from '../../domain/exceptions';
import { Project } from '../../domain/project.aggregate';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../domain/ports/project.repository';

export interface ProjectMutationInput {
  projectId: string;
  ownerId: string;
  expectedRevision: number;
  mutate: (project: Project) => void;
}

@Injectable()
export class ProjectMutationService {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  public async mutate(
    input: ProjectMutationInput,
  ): Promise<Result<Project, DomainException>> {
    const project = await this.projectRepository.findByIdForOwner(
      input.projectId,
      input.ownerId,
    );

    if (!project) {
      return Result.fail(new ProjectNotFoundException(input.projectId));
    }

    if (project.revision !== input.expectedRevision) {
      return Result.fail(
        new ProjectRevisionConflictException(
          input.projectId,
          input.expectedRevision,
        ),
      );
    }

    try {
      input.mutate(project);
    } catch (error: unknown) {
      if (error instanceof DomainException) {
        return Result.fail(error);
      }

      throw error;
    }

    if (project.revision === input.expectedRevision) {
      return Result.ok(project);
    }

    const updated = await this.projectRepository.update(
      project,
      input.expectedRevision,
    );

    return updated
      ? Result.ok(project)
      : Result.fail(
          new ProjectRevisionConflictException(
            input.projectId,
            input.expectedRevision,
          ),
        );
  }
}
