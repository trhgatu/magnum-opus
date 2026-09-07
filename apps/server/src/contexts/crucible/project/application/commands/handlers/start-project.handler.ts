import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Project } from '../../../domain/project.aggregate';
import { ProjectMutationService } from '../../services';
import { StartProjectCommand } from '../start-project.command';

@CommandHandler(StartProjectCommand)
export class StartProjectHandler implements ICommandHandler<
  StartProjectCommand,
  Result<Project, DomainException>
> {
  constructor(private readonly mutationService: ProjectMutationService) {}

  public execute(
    command: StartProjectCommand,
  ): Promise<Result<Project, DomainException>> {
    return this.mutationService.mutate({
      projectId: command.projectId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (project) => project.start(),
    });
  }
}
