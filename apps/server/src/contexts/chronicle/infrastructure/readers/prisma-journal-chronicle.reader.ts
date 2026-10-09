import { Injectable } from '@nestjs/common';

import { JournalEntryState } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { ChronicleSectionReader } from '../../application/ports/chronicle-section-reader.port';
import { JournalSectionData } from '../../application/section-data';
import { ChroniclePeriod } from '../../domain/value-objects';

@Injectable()
export class PrismaJournalChronicleReader implements ChronicleSectionReader<'journal'> {
  public readonly module = 'journal' as const;
  public readonly schemaVersion = 1;
  public readonly historyOnly = false;

  constructor(private readonly prisma: PrismaService) {}

  public async getSummary(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<JournalSectionData> {
    const entryCount = await this.prisma.journalEntry.count({
      where: {
        ownerId,
        state: JournalEntryState.SEALED,
        createdAt: { gte: period.start, lt: period.end },
      },
    });

    return { entryCount };
  }
}
