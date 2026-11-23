import { PrismaGardenLedgerReader } from './prisma-garden-ledger.reader';

describe('PrismaGardenLedgerReader', () => {
  const gardenSubject = { findMany: jest.fn() };
  const gardenEntry = { findFirst: jest.fn() };
  const reader = new PrismaGardenLedgerReader({
    gardenSubject,
    gardenEntry,
  } as never);

  it("reads the owner's latest reflection up to today", async () => {
    gardenEntry.findFirst.mockResolvedValue({
      occurredOn: new Date('2026-11-20T00:00:00.000Z'),
    });

    await expect(
      reader.lastReflectedOn('owner-id', '2026-11-23'),
    ).resolves.toBe('2026-11-20');
    expect(gardenEntry.findFirst).toHaveBeenCalledWith({
      where: {
        ownerId: 'owner-id',
        kind: 'REFLECTED',
        occurredOn: { lte: new Date('2026-11-23T00:00:00.000Z') },
      },
      orderBy: { occurredOn: 'desc' },
      select: { occurredOn: true },
    });
  });

  it('returns null for an owner who never reflected', async () => {
    gardenEntry.findFirst.mockResolvedValue(null);

    await expect(
      reader.lastReflectedOn('owner-id', '2026-11-23'),
    ).resolves.toBeNull();
  });

  it("reads the owner's visible trees with their ledger in recorded order", async () => {
    gardenSubject.findMany.mockResolvedValue([
      {
        id: 'subject-id',
        subjectKind: 'HABIT',
        subjectId: 'habit-id',
        variant: 'BUILD',
        name: 'Gym',
        nameAtPlanting: 'Gym',
        bedId: 'routine-id',
        bedName: 'Morning',
        simVersion: 1,
        plantedOn: new Date('2026-11-02T00:00:00.000Z'),
        entries: [
          {
            kind: 'RHYTHM_SET',
            occurredOn: new Date('2026-11-02T00:00:00.000Z'),
            mark: null,
            detail: { type: 'WEEKLY', days: [1, 5] },
          },
          {
            kind: 'TENDED',
            occurredOn: new Date('2026-11-06T00:00:00.000Z'),
            mark: null,
            detail: null,
          },
        ],
      },
    ]);

    const subjects = await reader.visibleSubjectsOf('owner-id');

    // Cây đang ẩn (nguồn ở Thùng rác) không vào vườn (BR-GDN-SB-007).
    expect(gardenSubject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: 'owner-id', hiddenAt: null },
        select: expect.objectContaining({
          bedId: true,
          bedName: true,
          entries: expect.objectContaining({
            orderBy: { sequence: 'asc' },
          }),
        }),
      }),
    );
    expect(subjects).toEqual([
      {
        id: 'subject-id',
        subjectKind: 'HABIT',
        subjectId: 'habit-id',
        variant: 'BUILD',
        name: 'Gym',
        nameAtPlanting: 'Gym',
        bed: { id: 'routine-id', name: 'Morning' },
        simVersion: 1,
        plantedOn: '2026-11-02',
        entries: [
          {
            kind: 'RHYTHM_SET',
            occurredOn: '2026-11-02',
            mark: null,
            detail: { type: 'WEEKLY', days: [1, 5] },
          },
          {
            kind: 'TENDED',
            occurredOn: '2026-11-06',
            mark: null,
            detail: null,
          },
        ],
      },
    ]);
  });
});
