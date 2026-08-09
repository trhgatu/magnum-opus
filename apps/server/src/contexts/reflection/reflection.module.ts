import { Module } from '@nestjs/common';

import { JournalModule } from './journal/journal.module';

@Module({
  imports: [JournalModule],
  exports: [JournalModule],
})
export class ReflectionModule {}
