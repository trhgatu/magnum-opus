import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  FindTimelineOptions,
  FindTimelineResult,
  TimelineReader,
} from '../../application/ports/timeline-reader.port';

@Injectable()
export class PrismaTimelineReader implements TimelineReader {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForOwner(
    ownerId: string,
    options: FindTimelineOptions,
  ): Promise<FindTimelineResult> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.reflectionTimelineEntry.findMany({
        where: { ownerId },
        orderBy: [{ occurredOn: 'desc' }, { id: 'asc' }],
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.reflectionTimelineEntry.count({ where: { ownerId } }),
    ]);

    // Bảng Timeline chỉ lưu sourceId — không lưu trùng title — nên phải tra
    // ngược sang Journal/Memory theo lô (2 query, không phải N+1 theo dòng).
    const journalIds = rows
      .filter((row) => row.entryType === 'JOURNAL_SEALED')
      .map((row) => row.sourceId);
    const memoryIds = rows
      .filter((row) => row.entryType === 'MEMORY_CREATED')
      .map((row) => row.sourceId);

    const [journals, memories] = await Promise.all([
      journalIds.length
        ? this.prisma.journalEntry.findMany({
            where: { id: { in: journalIds } },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      memoryIds.length
        ? this.prisma.memory.findMany({
            where: { id: { in: memoryIds } },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
    ]);

    const journalTitles = new Map(
      journals.map((j): [string, string | null] => [j.id, j.title]),
    );
    const memoryTitles = new Map(
      memories.map((m): [string, string] => [m.id, m.title]),
    );

    const entries = rows.map((row) => {
      const titles =
        row.entryType === 'JOURNAL_SEALED' ? journalTitles : memoryTitles;
      const sourceExists = titles.has(row.sourceId);

      return {
        id: row.id,
        entryType: row.entryType,
        sourceId: row.sourceId,
        occurredOn: row.occurredOn,
        // Nguồn có thể đã bị xóa vĩnh viễn - Timeline không tự dọn theo vòng
        // đời nguồn, nên phải phân biệt rõ "không có tiêu đề" và "đã xóa".
        title: sourceExists ? (titles.get(row.sourceId) ?? null) : null,
        sourceExists,
      };
    });

    return { entries, total };
  }
}
