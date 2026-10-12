import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Project } from '../../../domain/project.aggregate';
import { ProjectMutationService } from '../../services';
import { SetTargetEndDateCommand } from '../set-target-end-date.command';

@CommandHandler(SetTargetEndDateCommand)
export class SetTargetEndDateHandler implements ICommandHandler<
  SetTargetEndDateCommand,
  Result<Project, DomainException>
> {
  constructor(private readonly mutationService: ProjectMutationService) {}

  public execute(
    command: SetTargetEndDateCommand,
  ): Promise<Result<Project, DomainException>> {
    return this.mutationService.mutate({
      projectId: command.projectId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (project) => project.setTargetEndAt(command.targetEndAt),
    });
  }
}
