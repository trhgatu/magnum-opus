import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Project } from '../../../domain/project.aggregate';
import { ProjectMutationService } from '../../services';
import { ReopenProjectCommand } from '../reopen-project.command';

@CommandHandler(ReopenProjectCommand)
export class ReopenProjectHandler implements ICommandHandler<
  ReopenProjectCommand,
  Result<Project, DomainException>
> {
  constructor(private readonly mutationService: ProjectMutationService) {}

  public execute(
    command: ReopenProjectCommand,
  ): Promise<Result<Project, DomainException>> {
    return this.mutationService.mutate({
      projectId: command.projectId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (project) => project.reopen(),
    });
  }
}
