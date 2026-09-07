import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  ProjectDeletionNotAllowedException,
  ProjectNotFoundException,
  ProjectRevisionConflictException,
} from '../../../domain/exceptions';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../../domain/ports/project.repository';
import { DeleteProjectCommand } from '../delete-project.command';

@CommandHandler(DeleteProjectCommand)
export class DeleteProjectHandler implements ICommandHandler<
  DeleteProjectCommand,
  Result<void, DomainException>
> {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  public async execute(
    command: DeleteProjectCommand,
  ): Promise<Result<void, DomainException>> {
    const project = await this.projectRepository.findByIdForOwner(
      command.projectId,
      command.ownerId,
    );

    if (!project) {
      return Result.fail(new ProjectNotFoundException(command.projectId));
    }

    if (project.revision !== command.expectedRevision) {
      return Result.fail(
        new ProjectRevisionConflictException(
          command.projectId,
          command.expectedRevision,
        ),
      );
    }

    if (!project.canBeDeleted()) {
      return Result.fail(
        new ProjectDeletionNotAllowedException(command.projectId),
      );
    }

    const deleted = await this.projectRepository.deletePermanently(
      command.projectId,
      command.ownerId,
      command.expectedRevision,
    );

    if (!deleted) {
      return Result.fail(
        new ProjectRevisionConflictException(
          command.projectId,
          command.expectedRevision,
        ),
      );
    }

    return Result.ok(undefined);
  }
}
