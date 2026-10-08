import { Injectable } from '@nestjs/common';

import { JournalEntryState } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { ChronicleSectionReader } from '../../application/ports';
import { MoodSectionData } from '../../application/section-data';
import { ChronicleMoodLabel } from '../../domain/enums';
import { ChroniclePeriod } from '../../domain/value-objects';

@Injectable()
export class PrismaMoodChronicleReader implements ChronicleSectionReader<'mood'> {
  public readonly module = 'mood' as const;
  public readonly schemaVersion = 1;
  public readonly historyOnly = false;

  constructor(private readonly prisma: PrismaService) {}

  public async getSummary(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<MoodSectionData> {
    const moods = await this.prisma.mood.findMany({
      where: {
        journalEntry: {
          ownerId,
          state: JournalEntryState.SEALED,
          createdAt: { gte: period.start, lt: period.end },
        },
      },
      select: { label: true },
      orderBy: [{ journalEntry: { createdAt: 'asc' } }, { id: 'asc' }],
    });

    const counts = new Map<ChronicleMoodLabel, number>();

    for (const mood of moods) {
      const label = mood.label as ChronicleMoodLabel;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    let dominantMood: ChronicleMoodLabel | null = null;
    let highestCount = 0;

    for (const [label, count] of counts) {
      if (count > highestCount) {
        dominantMood = label;
        highestCount = count;
      }
    }

    return { dominantMood, distribution: Object.fromEntries(counts) };
  }
}
