import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { CompleteProjectHandler } from './application/commands/handlers/complete-project.handler';
import { CreateProjectHandler } from './application/commands/handlers/create-project.handler';
import { DeleteProjectHandler } from './application/commands/handlers/delete-project.handler';
import { PauseProjectHandler } from './application/commands/handlers/pause-project.handler';
import { ReopenProjectHandler } from './application/commands/handlers/reopen-project.handler';
import { ResumeProjectHandler } from './application/commands/handlers/resume-project.handler';
import { SetIntendedOutcomeHandler } from './application/commands/handlers/set-intended-outcome.handler';
import { StartProjectHandler } from './application/commands/handlers/start-project.handler';
import { StopProjectHandler } from './application/commands/handlers/stop-project.handler';
import { UpdateProjectHandler } from './application/commands/handlers/update-project.handler';
import { PROJECT_READER } from './application/ports/project-reader.port';
import { GetProjectHandler } from './application/queries/handlers/get-project.handler';
import { GetProjectsHandler } from './application/queries/handlers/get-projects.handler';
import { ProjectMutationService } from './application/services';
import { PROJECT_REPOSITORY } from './domain/ports/project.repository';
import { PrismaProjectReader } from './infrastructure/readers/prisma-project.reader';
import { PrismaProjectRepository } from './infrastructure/repositories/prisma-project.repository';
import { ProjectController } from './presentation/controllers/project.controller';

const commandHandlers = [
  CreateProjectHandler,
  UpdateProjectHandler,
  StartProjectHandler,
  PauseProjectHandler,
  ResumeProjectHandler,
  StopProjectHandler,
  CompleteProjectHandler,
  ReopenProjectHandler,
  SetIntendedOutcomeHandler,
  DeleteProjectHandler,
];
const queryHandlers = [GetProjectHandler, GetProjectsHandler];

@Module({
  imports: [CqrsModule],
  controllers: [ProjectController],
  providers: [
    {
      provide: PROJECT_REPOSITORY,
      useClass: PrismaProjectRepository,
    },
    {
      provide: PROJECT_READER,
      useClass: PrismaProjectReader,
    },
    ProjectMutationService,
    ...commandHandlers,
    ...queryHandlers,
  ],
})
export class ProjectModule {}
