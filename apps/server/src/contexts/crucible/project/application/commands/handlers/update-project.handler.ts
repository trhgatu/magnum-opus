import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Project } from '../../../domain/project.aggregate';
import { ProjectMutationService } from '../../services';
import { UpdateProjectCommand } from '../update-project.command';

@CommandHandler(UpdateProjectCommand)
export class UpdateProjectHandler implements ICommandHandler<
  UpdateProjectCommand,
  Result<Project, DomainException>
> {
  constructor(private readonly mutationService: ProjectMutationService) {}

  public execute(
    command: UpdateProjectCommand,
  ): Promise<Result<Project, DomainException>> {
    return this.mutationService.mutate({
      projectId: command.projectId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (project) =>
        project.update({
          title: command.title,
          description: command.description,
        }),
    });
  }
}
