import { PrismaActivityEventWriter } from './prisma-activity-event-writer';

describe('PrismaActivityEventWriter', () => {
  const activityEvent = { createMany: jest.fn() };
  const writer = new PrismaActivityEventWriter({ activityEvent } as never);

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
});
