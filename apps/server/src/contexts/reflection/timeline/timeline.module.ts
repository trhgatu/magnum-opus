import { Module } from '@nestjs/common';

import { TIMELINE_WRITER } from './application/ports/timeline-writer.port';

import { PrismaTimelineWriter } from './infrastructure/writers/prisma-timeline.writer';

@Module({
  providers: [
    {
      provide: TIMELINE_WRITER,
      useClass: PrismaTimelineWriter,
    },
  ],
  exports: [TIMELINE_WRITER],
})
export class TimelineModule {}
