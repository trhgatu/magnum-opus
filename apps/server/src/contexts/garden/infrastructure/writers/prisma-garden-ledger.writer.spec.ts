import { Prisma } from '@repo/database';

import { CURRENT_SIM_VERSION } from '../../domain/garden-subject';

import { PrismaGardenLedgerWriter } from './prisma-garden-ledger.writer';

describe('PrismaGardenLedgerWriter', () => {
  const gardenSubject = {
    create: jest.fn(),
    deleteMany: jest.fn(),
    findUnique: jest.fn(),
  };
  const gardenEntry = {
    create: jest.fn(),
  };
  const writer = new PrismaGardenLedgerWriter({
    gardenSubject,
    gardenEntry,
  } as never);

  const subject = {
    ownerId: 'owner-id',
    subjectKind: 'HABIT' as const,
    subjectId: 'habit-id',
    variant: 'BUILD' as const,
    nameAtPlanting: 'Morning walk',
    plantedOn: new Date('2026-11-16T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('plant', () => {
    // Cây giữ dáng mãi: phiên bản thuật toán mọc chốt lúc gieo.
    it('stores the subject with the current sim version', async () => {
      gardenSubject.create.mockResolvedValue(undefined);

      await writer.plant(subject);

      expect(gardenSubject.create).toHaveBeenCalledWith({
        data: { ...subject, simVersion: CURRENT_SIM_VERSION },
      });
    });

    // Outbox có thể giao lại một event: gieo lần hai là không làm gì.
    it('treats an already planted subject as done', async () => {
      gardenSubject.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['subject_kind', 'subject_id'] },
        }),
      );

      await expect(writer.plant(subject)).resolves.toBeUndefined();
    });

    it('lets any other failure reach the outbox for a retry', async () => {
      gardenSubject.create.mockRejectedValue(new Error('connection lost'));

      await expect(writer.plant(subject)).rejects.toThrow('connection lost');
    });
  });

  describe('uproot', () => {
    // Không còn gì để nhổ (giao lại, hoặc chưa từng gieo) cũng là xong.
    it('deletes the subject by its source identity', async () => {
      gardenSubject.deleteMany.mockResolvedValue({ count: 0 });

      await writer.uproot('HABIT', 'habit-id');

      expect(gardenSubject.deleteMany).toHaveBeenCalledWith({
        where: { subjectKind: 'HABIT', subjectId: 'habit-id' },
      });
    });
  });

  describe('record', () => {
    const entry = {
      subjectKind: 'HABIT' as const,
      subjectId: 'habit-id',
      kind: 'TENDED' as const,
      occurredOn: new Date('2026-11-16T00:00:00.000Z'),
      sourceEventId: 'event-id',
    };

    it('writes the entry against the planted subject', async () => {
      gardenSubject.findUnique.mockResolvedValue({
        id: 'subject-id',
        ownerId: 'owner-id',
      });
      gardenEntry.create.mockResolvedValue(undefined);

      await writer.record(entry);

      expect(gardenSubject.findUnique).toHaveBeenCalledWith({
        where: {
          subjectKind_subjectId: {
            subjectKind: 'HABIT',
            subjectId: 'habit-id',
          },
        },
        select: { id: true, ownerId: true },
      });
      expect(gardenEntry.create).toHaveBeenCalledWith({
        data: {
          ownerId: 'owner-id',
          subjectId: 'subject-id',
          kind: 'TENDED',
          occurredOn: new Date('2026-11-16T00:00:00.000Z'),
          sourceEventId: 'event-id',
        },
      });
    });

    // Habit tạo trước khi có Garden chưa có cây: nạp lịch sử (G1e) lo phần đó.
    it('skips an entry whose subject was never planted', async () => {
      gardenSubject.findUnique.mockResolvedValue(null);

      await expect(writer.record(entry)).resolves.toBeUndefined();

      expect(gardenEntry.create).not.toHaveBeenCalled();
    });

    it('treats an already recorded event as done', async () => {
      gardenSubject.findUnique.mockResolvedValue({
        id: 'subject-id',
        ownerId: 'owner-id',
      });
      gardenEntry.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['source_event_id'] },
        }),
      );

      await expect(writer.record(entry)).resolves.toBeUndefined();
    });

    it('lets any other failure reach the outbox for a retry', async () => {
      gardenSubject.findUnique.mockResolvedValue({
        id: 'subject-id',
        ownerId: 'owner-id',
      });
      gardenEntry.create.mockRejectedValue(new Error('connection lost'));

      await expect(writer.record(entry)).rejects.toThrow('connection lost');
    });
  });
});
