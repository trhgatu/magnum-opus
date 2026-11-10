import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import type {
  OnThisDayReader,
  OnThisDayRecord,
} from '../../application/ports/on-this-day-reader.port';

const LIMIT = 10;

@Injectable()
export class PrismaOnThisDayReader implements OnThisDayReader {
  constructor(private readonly prisma: PrismaService) {}

  public async getTimeZone(ownerId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: ownerId },
      select: { timeZone: true },
    });
    return user.timeZone;
  }

  public findMemories(
    ownerId: string,
    monthDays: readonly string[],
    beforeYear: number,
  ): Promise<OnThisDayRecord[]> {
    return this.prisma.$queryRaw<OnThisDayRecord[]>`
      SELECT id, title,
        to_char(occurred_on, 'YYYY-MM-DD') AS day,
        NULL::text AS excerpt,
        source_journal_entry_id AS "sourceJournalEntryId"
      FROM memories
      WHERE owner_id = ${ownerId}
        AND state = 'ACTIVE'
        AND occurred_on_precision = 'DAY'
        AND to_char(occurred_on, 'MM-DD') = ANY(${monthDays})
        AND EXTRACT(YEAR FROM occurred_on) < ${beforeYear}
      ORDER BY occurred_on DESC
      LIMIT ${LIMIT}
    `;
  }

  public findJournalEntries(
    ownerId: string,
    monthDays: readonly string[],
    beforeYear: number,
    timeZone: string,
  ): Promise<OnThisDayRecord[]> {
    return this.prisma.$queryRaw<OnThisDayRecord[]>`
      SELECT id, title,
        to_char(local_at, 'YYYY-MM-DD') AS day,
        NULLIF(left(btrim(regexp_replace(content, '\\s+', ' ', 'g')), 80), '') AS excerpt,
        NULL::text AS "sourceJournalEntryId"
      FROM (
        SELECT id, title, content,
          (created_at AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone} AS local_at
        FROM journal_entries
        WHERE owner_id = ${ownerId} AND state <> 'TRASHED'
      ) AS entry
      WHERE to_char(local_at, 'MM-DD') = ANY(${monthDays})
        AND EXTRACT(YEAR FROM local_at) < ${beforeYear}
      ORDER BY local_at DESC
      LIMIT ${LIMIT}
    `;
  }
}
