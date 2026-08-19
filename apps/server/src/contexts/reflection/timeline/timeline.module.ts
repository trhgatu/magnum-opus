import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { GetTimelineHandler } from './application/queries/handlers/get-timeline.handler';
import { TIMELINE_READER } from './application/ports/timeline-reader.port';
import { TIMELINE_WRITER } from './application/ports/timeline-writer.port';

import { PrismaTimelineReader } from './infrastructure/readers/prisma-timeline.reader';
import { PrismaTimelineWriter } from './infrastructure/writers/prisma-timeline.writer';
import { TimelineController } from './presentation/controllers/timeline.controller';

@Module({
  imports: [CqrsModule],
  controllers: [TimelineController],
  providers: [
    GetTimelineHandler,
    {
      provide: TIMELINE_WRITER,
      useClass: PrismaTimelineWriter,
    },
    {
      provide: TIMELINE_READER,
      useClass: PrismaTimelineReader,
    },
  ],
  exports: [TIMELINE_WRITER],
})
export class TimelineModule {}
