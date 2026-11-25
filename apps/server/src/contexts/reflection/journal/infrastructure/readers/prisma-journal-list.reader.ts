import { Injectable } from '@nestjs/common';
import type { MoodLabel } from '@repo/contracts';

import { PrismaService } from '@infrastructure/database/prisma.service';

import type {
  JournalEntryExtras,
  JournalListReader,
} from '../../application/ports/journal-list-reader.port';

@Injectable()
export class PrismaJournalListReader implements JournalListReader {
  constructor(private readonly prisma: PrismaService) {}

  async extrasFor(
    ownerId: string,
    entryIds: readonly string[],
  ): Promise<Map<string, JournalEntryExtras>> {
    if (entryIds.length === 0) return new Map();
    const ids = [...entryIds];
    const [moods, memories] = await Promise.all([
      this.prisma.mood.findMany({
        where: { journalEntryId: { in: ids }, journalEntry: { ownerId } },
        select: { journalEntryId: true, label: true },
      }),
      this.prisma.memory.groupBy({
        by: ['sourceJournalEntryId'],
        where: { ownerId, state: 'ACTIVE', sourceJournalEntryId: { in: ids } },
        _count: { _all: true },
      }),
    ]);
    const moodOf = new Map(
      moods.map((mood) => [mood.journalEntryId, mood.label as MoodLabel]),
    );
    const countOf = new Map(
      memories.map((row) => [row.sourceJournalEntryId, row._count._all]),
    );
    return new Map(
      ids.map((id) => [
        id,
        { mood: moodOf.get(id) ?? null, memoryCount: countOf.get(id) ?? 0 },
      ]),
    );
  }

  async writtenDaysLast7(ownerId: string, now: Date): Promise<number> {
    const [row] = await this.prisma.$queryRaw<{ days: bigint }[]>`
      SELECT COUNT(DISTINCT (e.created_at AT TIME ZONE 'UTC' AT TIME ZONE u.time_zone)::date) AS days
      FROM journal_entries e
      JOIN users u ON u.id = e.owner_id
      WHERE e.owner_id = ${ownerId}
        AND e.state <> 'TRASHED'
        AND (e.created_at AT TIME ZONE 'UTC' AT TIME ZONE u.time_zone)::date
          > (${now}::timestamptz AT TIME ZONE u.time_zone)::date - 7
    `;
    return Number(row?.days ?? 0);
  }
}
