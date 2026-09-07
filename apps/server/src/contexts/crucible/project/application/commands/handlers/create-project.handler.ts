import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Project } from '../../../domain/project.aggregate';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../../domain/ports/project.repository';
import { CreateProjectCommand } from '../create-project.command';

@CommandHandler(CreateProjectCommand)
export class CreateProjectHandler implements ICommandHandler<
  CreateProjectCommand,
  Result<Project, DomainException>
> {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  public async execute(
    command: CreateProjectCommand,
  ): Promise<Result<Project, DomainException>> {
    const project = Project.create({
      ownerId: command.ownerId,
      title: command.title,
      description: command.description,
    });

    await this.projectRepository.create(project);

    return Result.ok(project);
  }
}
