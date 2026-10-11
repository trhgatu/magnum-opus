import { MemoryState } from '@repo/database';

import { ChroniclePeriod } from '../../domain/value-objects';

import { PrismaMemoryChronicleReader } from './prisma-memory-chronicle.reader';

describe('PrismaMemoryChronicleReader', () => {
  const memoryModel = { count: jest.fn() };
  const prisma = { memory: memoryModel };
  const reader = new PrismaMemoryChronicleReader(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('declares itself as the memory reader that depends on current state', () => {
    expect(reader.module).toBe('memory');
    expect(reader.schemaVersion).toBe(1);
    expect(reader.historyOnly).toBe(false);
  });

  it('counts active memories of the owner created inside the period', async () => {
    memoryModel.count.mockResolvedValue(4);
    const period = ChroniclePeriod.forMonth(2026, 9, 'Asia/Ho_Chi_Minh');

    await expect(reader.getSummary('owner-id', period)).resolves.toEqual({
      memoryCount: 4,
    });

    expect(memoryModel.count).toHaveBeenCalledWith({
      where: {
        ownerId: 'owner-id',
        state: MemoryState.ACTIVE,
        createdAt: { gte: period.start, lt: period.end },
      },
    });
  });

  it('filters by createdAt (when it was saved), not occurredOn', async () => {
    // BA chốt "tháng này đã LƯU bao nhiêu kỷ niệm" — một kỷ niệm từ 2015
    // được ghi lại trong tháng 9 vẫn thuộc tháng 9.
    memoryModel.count.mockResolvedValue(1);

    await reader.getSummary(
      'owner-id',
      ChroniclePeriod.forMonth(2026, 9, 'UTC'),
    );

    const { where } = memoryModel.count.mock.calls[0][0];
    expect(where).toHaveProperty('createdAt');
    expect(where).not.toHaveProperty('occurredOn');
  });

  it('returns zero for a period without memories', async () => {
    memoryModel.count.mockResolvedValue(0);

    await expect(
      reader.getSummary('owner-id', ChroniclePeriod.forMonth(2020, 1, 'UTC')),
    ).resolves.toEqual({ memoryCount: 0 });
  });
});
