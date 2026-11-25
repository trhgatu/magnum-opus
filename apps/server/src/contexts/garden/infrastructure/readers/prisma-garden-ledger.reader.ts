import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';
import { CalendarDay, calendarDayOf } from '@shared/domain/calendar-day';
import { calendarDayToDate } from '@shared/domain/calendar-day';

import type {
  GardenLedgerReader,
  GardenSubjectLedger,
  GardenLanternRow,
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
        bedId: true,
        bedName: true,
      },
    });

    return subjects.map(
      ({ plantedOn, entries, bedId, bedName, ...subject }) => ({
        ...subject,
        plantedOn: calendarDayOf(plantedOn),
        bed: bedId && bedName ? { id: bedId, name: bedName } : null,
        entries: entries.map((entry) => ({
          kind: entry.kind,
          occurredOn: calendarDayOf(entry.occurredOn),
          mark: entry.mark,
          // CHECK của DB chỉ cho detail trên dòng RHYTHM_SET, đúng dạng writer ghi.
          detail: entry.detail as GardenSchedule | null,
        })),
      }),
    );
  }

  async lastReflectedOn(
    ownerId: string,
    today: CalendarDay,
  ): Promise<CalendarDay | null> {
    const row = await this.prisma.gardenEntry.findFirst({
      where: {
        ownerId,
        kind: 'REFLECTED',
        occurredOn: {
          lte: calendarDayToDate(today),
        },
      },
      orderBy: { occurredOn: 'desc' },
      select: { occurredOn: true },
    });
    return row ? calendarDayOf(row.occurredOn) : null;
  }

  async visibleLanternsOf(ownerId: string): Promise<GardenLanternRow[]> {
    const rows = await this.prisma.gardenLantern.findMany({
      where: { ownerId, hiddenAt: null },
      orderBy: [
        { occurredOn: { sort: 'asc', nulls: 'first' } },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      select: { id: true, memoryId: true, occurredOn: true, precision: true },
    });
    return rows.map((row) => ({
      ...row,
      occurredOn: row.occurredOn ? calendarDayOf(row.occurredOn) : null,
    }));
  }
}
