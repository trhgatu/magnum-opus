import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';
import { calendarDayOf } from '@shared/domain/calendar-day';

import type {
  GardenLedgerReader,
  GardenSubjectLedger,
} from '../../application/ports/garden-ledger-reader.port';
import type { GardenSchedule } from '../../domain/garden-entry';

@Injectable()
export class PrismaGardenLedgerReader implements GardenLedgerReader {
  constructor(private readonly prisma: PrismaService) {}

  async visibleSubjectsOf(ownerId: string): Promise<GardenSubjectLedger[]> {
    const subjects = await this.prisma.gardenSubject.findMany({
      where: { ownerId, hiddenAt: null },
      orderBy: [{ plantedOn: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        subjectKind: true,
        subjectId: true,
        variant: true,
        name: true,
        nameAtPlanting: true,
        simVersion: true,
        plantedOn: true,
        // Thứ tự ghi: cùng ngày thì dòng ghi sau thắng (vd đổi lịch hai lần).
        entries: {
          orderBy: { sequence: 'asc' },
          select: { kind: true, occurredOn: true, mark: true, detail: true },
        },
      },
    });

    return subjects.map(({ plantedOn, entries, ...subject }) => ({
      ...subject,
      plantedOn: calendarDayOf(plantedOn),
      entries: entries.map((entry) => ({
        kind: entry.kind,
        occurredOn: calendarDayOf(entry.occurredOn),
        mark: entry.mark,
        // CHECK của DB chỉ cho detail trên dòng RHYTHM_SET, đúng dạng writer ghi.
        detail: entry.detail as GardenSchedule | null,
      })),
    }));
  }
}
