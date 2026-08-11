import { Module } from '@nestjs/common';

import { JournalModule } from './journal/journal.module';
import { MoodModule } from './mood/mood.module';

@Module({
  imports: [JournalModule, MoodModule],
  exports: [JournalModule, MoodModule],
})
export class ReflectionModule {}
