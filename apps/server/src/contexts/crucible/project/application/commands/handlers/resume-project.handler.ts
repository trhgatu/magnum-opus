import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Project } from '../../../domain/project.aggregate';
import { ProjectMutationService } from '../../services';
import { ResumeProjectCommand } from '../resume-project.command';

@CommandHandler(ResumeProjectCommand)
export class ResumeProjectHandler implements ICommandHandler<
  ResumeProjectCommand,
  Result<Project, DomainException>
> {
  constructor(private readonly mutationService: ProjectMutationService) {}

  public execute(
    command: ResumeProjectCommand,
  ): Promise<Result<Project, DomainException>> {
    return this.mutationService.mutate({
      projectId: command.projectId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (project) => project.resume(),
    });
  }
}
