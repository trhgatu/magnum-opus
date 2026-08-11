import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { JournalModule } from '../journal/journal.module';
import { RemoveMoodHandler } from './application/commands/handlers/remove-mood.handler';
import { SetMoodHandler } from './application/commands/handlers/set-mood.handler';
import { GetMoodHandler } from './application/queries/handlers/get-mood.handler';
import { MOOD_REPOSITORY } from './domain/ports/mood.repository';
import { PrismaMoodRepository } from './infrastructure/repositories/prisma-mood.repository';
import { MoodController } from './presentation/controllers/mood.controller';

const commandHandlers = [RemoveMoodHandler, SetMoodHandler];
const queryHandlers = [GetMoodHandler];

@Module({
  imports: [CqrsModule, JournalModule],
  controllers: [MoodController],
  providers: [
    {
      provide: MOOD_REPOSITORY,
      useClass: PrismaMoodRepository,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [MOOD_REPOSITORY],
})
export class MoodModule {}
