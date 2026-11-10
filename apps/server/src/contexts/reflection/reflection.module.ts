import { Module } from '@nestjs/common';

import { JournalModule } from './journal/journal.module';
import { MemoryModule } from './memory/memory.module';
import { MoodModule } from './mood/mood.module';
import { TimelineModule } from './timeline/timeline.module';
import { OnThisDayModule } from './on-this-day/on-this-day.module';
@Module({
  imports: [
    JournalModule,
    MemoryModule,
    MoodModule,
    TimelineModule,
    OnThisDayModule,
  ],
})
export class ReflectionModule {}
