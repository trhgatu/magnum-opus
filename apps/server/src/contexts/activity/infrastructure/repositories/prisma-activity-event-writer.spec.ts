import { PrismaActivityEventWriter } from './prisma-activity-event-writer';

describe('PrismaActivityEventWriter', () => {
  const activityEvent = { createMany: jest.fn(), deleteMany: jest.fn() };
  const $transaction = jest.fn();
  const writer = new PrismaActivityEventWriter({
    activityEvent,
    $transaction,
  } as never);

  beforeEach(() => jest.clearAllMocks());

  it('appends events, skipping any already in the ledger', async () => {
    activityEvent.createMany.mockResolvedValue({ count: 1 });
    const occurredAt = new Date('2026-10-05T04:38:41.000Z');

    const added = await writer.append('feed-id', [
      { kind: 'COMMIT_AUTHORED', occurredAt, quantity: 1, dedupeKey: 'abc' },
      { kind: 'PR_OPENED', occurredAt, quantity: 1, dedupeKey: '162' },
    ]);

    expect(added).toBe(1);
    expect(activityEvent.createMany).toHaveBeenCalledWith({
      data: [
        {
          feedId: 'feed-id',
          kind: 'COMMIT_AUTHORED',
          occurredAt,
          quantity: 1,
          dedupeKey: 'abc',
        },
        {
          feedId: 'feed-id',
          kind: 'PR_OPENED',
          occurredAt,
          quantity: 1,
          dedupeKey: '162',
        },
      ],
      // Sổ chỉ thêm dòng: khóa (feed, kind, dedupeKey) đã có thì bỏ qua,
      // không bao giờ sửa dòng cũ.
      skipDuplicates: true,
    });
  });

  it('does not touch the database when there is nothing to append', async () => {
    await expect(writer.append('feed-id', [])).resolves.toBe(0);

    expect(activityEvent.createMany).not.toHaveBeenCalled();
  });

  describe('replace', () => {
    const day = (date: string) => {
      const from = new Date(`${date}T00:00:00.000Z`);
      return { from, to: new Date(from.getTime() + 86_400_000) };
    };
    const coding = (occurredAt: string, quantity: number) => ({
      kind: 'CODING_TIME' as const,
      occurredAt: new Date(occurredAt),
      quantity,
      dedupeKey: occurredAt,
    });

    beforeEach(() => {
      activityEvent.deleteMany.mockReturnValue('delete-operation');
      activityEvent.createMany.mockReturnValue('create-operation');
      $transaction.mockResolvedValue([{ count: 3 }, { count: 1 }]);
    });

    it('deletes the coding time of the read days and writes it again, all at once', async () => {
      const event = coding('2026-10-15T09:00:00.000Z', 5400);

      await expect(
        writer.replace(
          'feed-id',
          [day('2026-10-15'), day('2026-10-16')],
          [event],
        ),
      ).resolves.toBe(1);

      expect(activityEvent.deleteMany).toHaveBeenCalledWith({
        where: {
          feedId: 'feed-id',
          // Commit và PR của cùng ngày không bị đụng tới.
          kind: 'CODING_TIME',
          OR: [
            {
              occurredAt: {
                gte: new Date('2026-10-15T00:00:00.000Z'),
                lt: new Date('2026-10-16T00:00:00.000Z'),
              },
            },
            {
              occurredAt: {
                gte: new Date('2026-10-16T00:00:00.000Z'),
                lt: new Date('2026-10-17T00:00:00.000Z'),
              },
            },
          ],
        },
      });
      expect(activityEvent.createMany).toHaveBeenCalledWith({
        data: [{ feedId: 'feed-id', ...event }],
        skipDuplicates: true,
      });
      // Xóa và ghi cùng thành công hoặc cùng không: không bao giờ để lại
      // ngày đã xóa mà chưa ghi lại.
      expect($transaction).toHaveBeenCalledWith([
        'delete-operation',
        'create-operation',
      ]);
    });

    it('never writes an event outside the days read in full', async () => {
      const inside = coding('2026-10-15T23:59:59.999Z', 60);
      const before = coding('2026-10-14T23:59:59.999Z', 60);
      // [from, to): nửa đêm thuộc về ngày sau.
      const atMidnight = coding('2026-10-16T00:00:00.000Z', 60);
      // Trong ngày nhưng không phải giờ code: phần xóa không bao giờ đụng
      // tới nó, nên phần ghi cũng không được nhận.
      const commit = {
        kind: 'COMMIT_AUTHORED' as const,
        occurredAt: new Date('2026-10-15T09:00:00.000Z'),
        quantity: 1,
        dedupeKey: 'abc',
      };

      await writer.replace(
        'feed-id',
        [day('2026-10-15')],
        [before, inside, atMidnight, commit],
      );

      expect(activityEvent.createMany).toHaveBeenCalledWith({
        data: [{ feedId: 'feed-id', ...inside }],
        skipDuplicates: true,
      });
    });

    it('does not touch the database when no day was read in full', async () => {
      await expect(
        writer.replace('feed-id', [], [coding('2026-10-15T09:00:00.000Z', 60)]),
      ).resolves.toBe(0);

      expect($transaction).not.toHaveBeenCalled();
      expect(activityEvent.deleteMany).not.toHaveBeenCalled();
      expect(activityEvent.createMany).not.toHaveBeenCalled();
    });
  });
});
