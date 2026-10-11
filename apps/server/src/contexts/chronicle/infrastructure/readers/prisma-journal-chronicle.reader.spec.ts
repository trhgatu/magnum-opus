import { JournalEntryState } from '@repo/database';

import { ChroniclePeriod } from '../../domain/value-objects';

import { PrismaJournalChronicleReader } from './prisma-journal-chronicle.reader';

describe('PrismaJournalChronicleReader', () => {
  const journalEntryModel = { count: jest.fn() };
  const prisma = { journalEntry: journalEntryModel };
  const reader = new PrismaJournalChronicleReader(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('declares itself as the journal reader that depends on current state', () => {
    expect(reader.module).toBe('journal');
    expect(reader.schemaVersion).toBe(1);
    // Lọc theo state hiện tại (thùng rác) nên không được tính lại khi
    // nâng phiên bản — DAP-CHR-008.
    expect(reader.historyOnly).toBe(false);
  });

  it('counts sealed entries of the owner created inside the period', async () => {
    journalEntryModel.count.mockResolvedValue(12);
    const period = ChroniclePeriod.forMonth(2026, 9, 'UTC');

    await expect(reader.getSummary('owner-id', period)).resolves.toEqual({
      entryCount: 12,
    });

    expect(journalEntryModel.count).toHaveBeenCalledWith({
      where: {
        ownerId: 'owner-id',
        state: JournalEntryState.SEALED,
        createdAt: { gte: period.start, lt: period.end },
      },
    });
  });

  it('bounds createdAt by local-midnight instants, not UTC dates', async () => {
    // Bài viết lúc 06:00 ngày 1/9 giờ Việt Nam được lưu là
    // 2026-08-31T23:00Z — phải thuộc tháng 9, nên ranh giới dưới phải là
    // 17:00Z ngày 31/8, không phải 00:00Z ngày 1/9.
    journalEntryModel.count.mockResolvedValue(0);
    const period = ChroniclePeriod.forMonth(2026, 9, 'Asia/Ho_Chi_Minh');

    await reader.getSummary('owner-id', period);

    const { createdAt } = journalEntryModel.count.mock.calls[0][0].where;
    const writtenAtSixLocal = new Date('2026-08-31T23:00:00.000Z');

    expect(createdAt.gte.toISOString()).toBe('2026-08-31T17:00:00.000Z');
    expect(createdAt.lt.toISOString()).toBe('2026-09-30T17:00:00.000Z');
    expect(writtenAtSixLocal >= createdAt.gte).toBe(true);
    expect(writtenAtSixLocal < createdAt.lt).toBe(true);
  });

  it('returns zero for a period without entries', async () => {
    journalEntryModel.count.mockResolvedValue(0);

    await expect(
      reader.getSummary('owner-id', ChroniclePeriod.forMonth(2020, 1, 'UTC')),
    ).resolves.toEqual({ entryCount: 0 });
  });
});
