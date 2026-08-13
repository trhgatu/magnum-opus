import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { CreateJournalEntryHandler } from './application/commands/handlers/create-journal-entry.handler';
import { DeleteJournalEntryHandler } from './application/commands/handlers/delete-journal-entry.handler';
import { ReopenJournalEntryHandler } from './application/commands/handlers/reopen-journal-entry.handler';
import { RestoreJournalEntryHandler } from './application/commands/handlers/restore-journal-entry.handler';
import { SealJournalEntryHandler } from './application/commands/handlers/seal-journal-entry.handler';
import { TrashJournalEntryHandler } from './application/commands/handlers/trash-journal-entry.handler';
import { UpdateJournalEntryHandler } from './application/commands/handlers/update-journal-entry.handler';
import { GetJournalEntriesHandler } from './application/queries/handlers/get-journal-entries.handler';
import { GetJournalEntryHandler } from './application/queries/handlers/get-journal-entry.handler';
import { JournalEntryMutationService } from './application/services';
import { JOURNAL_ENTRY_REPOSITORY } from './domain/ports/journal-entry.repository';
import { PrismaJournalEntryRepository } from './infrastructure/repositories/prisma-journal-entry.repository';
import { JournalController } from './presentation/controllers/journal.controller';

const commandHandlers = [
  CreateJournalEntryHandler,
  DeleteJournalEntryHandler,
  ReopenJournalEntryHandler,
  RestoreJournalEntryHandler,
  SealJournalEntryHandler,
  TrashJournalEntryHandler,
  UpdateJournalEntryHandler,
];

const queryHandlers = [GetJournalEntriesHandler, GetJournalEntryHandler];

@Module({
  imports: [CqrsModule],
  controllers: [JournalController],
  providers: [
    {
      provide: JOURNAL_ENTRY_REPOSITORY,
      useClass: PrismaJournalEntryRepository,
    },
    JournalEntryMutationService,
    ...commandHandlers,
    ...queryHandlers,
  ],
})
export class JournalModule {}
