import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import {
  CHRONICLE_SECTION_READERS,
  type ChronicleSectionReader,
} from './application/ports/chronicle-section-reader.port';
import { CHRONICLE_SNAPSHOT_REPOSITORY } from './application/ports/chronicle-snapshot.repository.port';
import { CLOCK } from './application/ports/clock.port';
import { USER_TIME_ZONE_READER } from './application/ports/user-time-zone-reader.port';
import { GetMonthlyChronicleHandler } from './application/queries/handlers/get-monthly-chronicle.handler';
import { ChronicleSectionReaderRegistry } from './application/services/chronicle-section-reader-registry';
import { SystemClock } from './infrastructure/clock/system-clock';
import { PrismaJournalChronicleReader } from './infrastructure/readers/prisma-journal-chronicle.reader';
import { PrismaMemoryChronicleReader } from './infrastructure/readers/prisma-memory-chronicle.reader';
import { PrismaMoodChronicleReader } from './infrastructure/readers/prisma-mood-chronicle.reader';
import { PrismaProjectChronicleReader } from './infrastructure/readers/prisma-project-chronicle.reader';
import { PrismaUserTimeZoneReader } from './infrastructure/readers/prisma-user-time-zone.reader';
import { PrismaHabitChronicleReader } from './infrastructure/readers/prisma-habit-chronicle.reader';
import { PrismaHabitHistoryReader } from './infrastructure/readers/prisma-habit-history.reader';
import { PrismaRoutineChronicleReader } from './infrastructure/readers/prisma-routine-chronicle.reader';
import { PrismaChronicleSnapshotRepository } from './infrastructure/repositories/prisma-chronicle-snapshot.repository';
import { ChronicleController } from './presentation/controllers/chronicle.controller';

const SECTION_READERS = [
  PrismaHabitChronicleReader,
  PrismaRoutineChronicleReader,
  PrismaJournalChronicleReader,
  PrismaMemoryChronicleReader,
  PrismaMoodChronicleReader,
  PrismaProjectChronicleReader,
];

@Module({
  imports: [CqrsModule],
  controllers: [ChronicleController],
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    { provide: USER_TIME_ZONE_READER, useClass: PrismaUserTimeZoneReader },
    {
      provide: CHRONICLE_SNAPSHOT_REPOSITORY,
      useClass: PrismaChronicleSnapshotRepository,
    },
    PrismaHabitHistoryReader,
    ...SECTION_READERS,
    {
      provide: CHRONICLE_SECTION_READERS,
      useFactory: (...readers: ChronicleSectionReader[]) => readers,
      inject: SECTION_READERS,
    },
    {
      provide: ChronicleSectionReaderRegistry,
      useFactory: (readers: ChronicleSectionReader[]) =>
        ChronicleSectionReaderRegistry.from(readers),
      inject: [CHRONICLE_SECTION_READERS],
    },
    GetMonthlyChronicleHandler,
  ],
})
export class ChronicleModule {}
