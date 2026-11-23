import type { GardenSubjectLedger } from '../../ports/garden-ledger-reader.port';
import { GetGardenQuery } from '../get-garden.query';
import { GetGardenHandler } from './get-garden.handler';

describe('GetGardenHandler', () => {
  const ledger = { visibleSubjectsOf: jest.fn() };
  const timeZoneReader = { getForUser: jest.fn() };
  const clock = { now: jest.fn() };
  const handler = new GetGardenHandler(ledger, timeZoneReader, clock);

  const quitTree: GardenSubjectLedger = {
    id: 'subject-id',
    subjectKind: 'HABIT',
    subjectId: 'habit-id',
    variant: 'QUIT',
    name: 'Quit sugar',
    nameAtPlanting: 'Quit sweets',
    bed: null,
    simVersion: 1,
    plantedOn: '2026-11-02',
    entries: [
      { kind: 'MARKED', occurredOn: '2026-11-03', mark: 'SCAR', detail: null },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ledger.visibleSubjectsOf.mockResolvedValue([quitTree]);
    timeZoneReader.getForUser.mockResolvedValue('Asia/Ho_Chi_Minh');
  });

  // 17:30Z Chủ nhật 15/11 đã là thứ Hai 16/11 ở Việt Nam: sang tuần mới.
  it("builds each tree's weeks up to the owner's today", async () => {
    clock.now.mockReturnValue(new Date('2026-11-15T17:30:00.000Z'));

    const garden = await handler.execute(new GetGardenQuery('owner-id'));

    expect(ledger.visibleSubjectsOf).toHaveBeenCalledWith('owner-id');
    expect(timeZoneReader.getForUser).toHaveBeenCalledWith('owner-id');
    expect(garden.today).toBe('2026-11-16');
    expect(garden.trees).toEqual([
      {
        id: 'subject-id',
        subjectKind: 'HABIT',
        subjectId: 'habit-id',
        variant: 'QUIT',
        name: 'Quit sugar',
        nameAtPlanting: 'Quit sweets',
        bed: null,
        simVersion: 1,
        plantedOn: '2026-11-02',
        weeks: [
          { start: '2026-11-02', status: 'CARED', scarred: true },
          { start: '2026-11-09', status: 'CARED', scarred: false },
          { start: '2026-11-16', status: 'CARED', scarred: false },
        ],
        weeds: 0,
      },
    ]);
  });

  it('returns an empty garden for an owner without trees', async () => {
    ledger.visibleSubjectsOf.mockResolvedValue([]);
    clock.now.mockReturnValue(new Date('2026-11-15T17:30:00.000Z'));

    await expect(
      handler.execute(new GetGardenQuery('owner-id')),
    ).resolves.toEqual({ today: '2026-11-16', trees: [] });
  });
});
