import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { CreateMemoryHandler } from './application/commands/handlers/create-memory.handler';
import { DeleteMemoryHandler } from './application/commands/handlers/delete-memory.handler';
import { RestoreMemoryHandler } from './application/commands/handlers/restore-memory.handler';
import { TrashMemoryHandler } from './application/commands/handlers/trash-memory.handler';
import { UpdateMemoryHandler } from './application/commands/handlers/update-memory.handler';
import { MEMORY_SOURCE_JOURNAL_READER } from './application/ports/memory-source-journal-reader.port';
import { GetMemoriesHandler } from './application/queries/handlers/get-memories.handler';
import { GetMemoryHandler } from './application/queries/handlers/get-memory.handler';
import { MemoryMutationService } from './application/services';
import { MEMORY_REPOSITORY } from './domain/ports/memory.repository';
import { PrismaMemorySourceJournalReader } from './infrastructure/readers/prisma-memory-source-journal.reader';
import { PrismaMemoryRepository } from './infrastructure/repositories/prisma-memory.repository';
import { MemoryController } from './presentation/controllers/memory.controller';

const commandHandlers = [
  CreateMemoryHandler,
  DeleteMemoryHandler,
  RestoreMemoryHandler,
  TrashMemoryHandler,
  UpdateMemoryHandler,
];
const queryHandlers = [GetMemoriesHandler, GetMemoryHandler];

@Module({
  imports: [CqrsModule],
  controllers: [MemoryController],
  providers: [
    {
      provide: MEMORY_REPOSITORY,
      useClass: PrismaMemoryRepository,
    },
    {
      provide: MEMORY_SOURCE_JOURNAL_READER,
      useClass: PrismaMemorySourceJournalReader,
    },
    MemoryMutationService,
    ...commandHandlers,
    ...queryHandlers,
  ],
})
export class MemoryModule {}
