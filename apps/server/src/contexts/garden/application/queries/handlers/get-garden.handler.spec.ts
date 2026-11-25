import type { GardenSubjectLedger } from '../../ports/garden-ledger-reader.port';
import { GetGardenQuery } from '../get-garden.query';
import { GetGardenHandler } from './get-garden.handler';

describe('GetGardenHandler', () => {
  const ledger = {
    visibleSubjectsOf: jest.fn(),
    visibleLanternsOf: jest.fn(),
    lastReflectedOn: jest.fn(),
  };
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
    ledger.lastReflectedOn.mockResolvedValue(null);
    ledger.visibleLanternsOf.mockResolvedValue([]);
  });

  // 17:30Z Chủ nhật 15/11 đã là thứ Hai 16/11 ở Việt Nam: sang tuần mới.
  it("builds each tree's weeks up to the owner's today", async () => {
    clock.now.mockReturnValue(new Date('2026-11-15T17:30:00.000Z'));

    const garden = await handler.execute(new GetGardenQuery('owner-id'));

    expect(ledger.visibleSubjectsOf).toHaveBeenCalledWith('owner-id');
    expect(timeZoneReader.getForUser).toHaveBeenCalledWith('owner-id');
    expect(garden.today).toBe('2026-11-16');
    expect(garden.light).toBe(0);
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
    ).resolves.toEqual({
      today: '2026-11-16',
      light: 0,
      trees: [],
      lanterns: [],
    });
  });

  // Sáng tỏ theo độ gần của lần nhìn lại gần nhất, tính theo hôm nay của owner.
  it('lights the garden from the latest reflection up to today', async () => {
    ledger.visibleSubjectsOf.mockResolvedValue([]);
    ledger.lastReflectedOn.mockResolvedValue('2026-11-09');
    clock.now.mockReturnValue(new Date('2026-11-15T17:30:00.000Z'));

    const garden = await handler.execute(new GetGardenQuery('owner-id'));

    expect(ledger.lastReflectedOn).toHaveBeenCalledWith(
      'owner-id',
      '2026-11-16',
    );
    expect(garden.light).toBe(0.75);
  });

  it('places each lantern on the path from its memory date', async () => {
    ledger.visibleSubjectsOf.mockResolvedValue([]);
    ledger.visibleLanternsOf.mockResolvedValue([
      {
        id: 'l1',
        memoryId: 'm1',
        occurredOn: '2018-08-01',
        precision: 'MONTH',
      },
      { id: 'l2', memoryId: 'm2', occurredOn: null, precision: 'UNKNOWN' },
    ]);
    clock.now.mockReturnValue(new Date('2026-11-15T17:30:00.000Z'));

    const garden = await handler.execute(new GetGardenQuery('owner-id'));

    expect(ledger.visibleLanternsOf).toHaveBeenCalledWith('owner-id');
    expect(garden.lanterns).toEqual([
      {
        id: 'l1',
        memoryId: 'm1',
        occurredOn: '2018-08-01',
        precision: 'MONTH',
        placedOn: '2018-08-15',
      },
      {
        id: 'l2',
        memoryId: 'm2',
        occurredOn: null,
        precision: 'UNKNOWN',
        placedOn: null,
      },
    ]);
  });
});
