import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { RemoveMoodHandler } from './application/commands/handlers/remove-mood.handler';
import { SetMoodHandler } from './application/commands/handlers/set-mood.handler';
import { MOOD_JOURNAL_ENTRY_READER } from './application/ports/mood-journal-entry-reader.port';
import { GetMoodHandler } from './application/queries/handlers/get-mood.handler';
import { MOOD_REPOSITORY } from './domain/ports/mood.repository';
import { PrismaMoodJournalEntryReader } from './infrastructure/readers/prisma-mood-journal-entry.reader';
import { PrismaMoodRepository } from './infrastructure/repositories/prisma-mood.repository';
import { MoodController } from './presentation/controllers/mood.controller';

const commandHandlers = [RemoveMoodHandler, SetMoodHandler];
const queryHandlers = [GetMoodHandler];

@Module({
  imports: [CqrsModule],
  controllers: [MoodController],
  providers: [
    {
      provide: MOOD_REPOSITORY,
      useClass: PrismaMoodRepository,
    },
    {
      provide: MOOD_JOURNAL_ENTRY_READER,
      useClass: PrismaMoodJournalEntryReader,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
})
export class MoodModule {}
